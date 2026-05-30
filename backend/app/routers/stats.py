"""GET /api/stats/overview — aggregated, scoped + windowed dashboard stats."""
import asyncio
from datetime import datetime

from fastapi import APIRouter, Query

from ..db import (
    ALERTS,
    DOMAINS,
    HTTP_PATHS,
    HTTP_PROBES,
    NUCLEI_HITS,
    NUCLEI_PASSIVE_HITS,
    PORTS,
    get_db,
)
from ..query import base_filter
from ..scopes import get_scope_names
from ..serializers import serialize_docs

router = APIRouter(prefix="/api/stats", tags=["stats"])

_ASSET_COLS = {
    "domains": DOMAINS,
    "http_probes": HTTP_PROBES,
    "ports": PORTS,
    "http_paths": HTTP_PATHS,
}
_RECENT_N = 10


@router.get("/overview")
async def overview(
    scope: str | None = Query(default=None),
    days: int = Query(default=30, ge=0, description="Alive window in days (0 = all)"),
):
    db = get_db()
    scope_names = None if scope else await get_scope_names()

    # Asset totals + new-this-week, within the alive window + scope.
    async def asset_counts(col: str):
        alive_q = base_filter(scope, alive_days=days, scope_names=scope_names)
        new_q = base_filter(scope, alive_days=days, added_days=7, scope_names=scope_names)
        total, new7 = await asyncio.gather(
            db[col].count_documents(alive_q),
            db[col].count_documents(new_q),
        )
        return total, new7

    asset_results = await asyncio.gather(*(asset_counts(c) for c in _ASSET_COLS.values()))
    totals = {}
    new_last_7d = {}
    for (label, _), (total, new7) in zip(_ASSET_COLS.items(), asset_results):
        totals[label] = total
        new_last_7d[label] = new7

    # Findings carry the same temporal model, so apply the alive window too.
    fscope = base_filter(scope, alive_days=days, scope_names=scope_names)

    async def severity_group(col: str):
        pipeline = [
            {"$match": fscope},
            {"$group": {"_id": {"$ifNull": ["$info.severity", "unknown"]}, "n": {"$sum": 1}}},
        ]
        return await db[col].aggregate(pipeline).to_list(length=None)

    sev_active, sev_passive = await asyncio.gather(
        severity_group(NUCLEI_HITS), severity_group(NUCLEI_PASSIVE_HITS)
    )
    findings_by_severity: dict[str, int] = {}
    findings_total = 0
    for group in (sev_active, sev_passive):
        for row in group:
            key = (row["_id"] or "unknown").lower()
            findings_by_severity[key] = findings_by_severity.get(key, 0) + row["n"]
            findings_total += row["n"]
    totals["findings"] = findings_total

    # Recent findings (active + passive merged) and recent alerts.
    async def recent_findings():
        out = []
        for col, is_passive in ((NUCLEI_HITS, False), (NUCLEI_PASSIVE_HITS, True)):
            # Findings have no `timestamp`; `add_date` is when nuclei first reported it.
            docs = await db[col].find(fscope).sort([("add_date", -1), ("_id", -1)]).limit(_RECENT_N).to_list(length=_RECENT_N)
            for d in docs:
                d["passive"] = is_passive
                d["severity"] = ((d.get("info") or {}).get("severity") or "unknown").lower()
            out.extend(docs)
        out.sort(key=lambda d: d.get("add_date") or datetime.min, reverse=True)
        return out[:_RECENT_N]

    async def recent_alerts():
        # Alerts are not scope-tagged, so they span all scopes.
        return await db[ALERTS].find().sort([("created_at", -1)]).limit(_RECENT_N).to_list(length=_RECENT_N)

    findings_docs, alerts_docs = await asyncio.gather(recent_findings(), recent_alerts())

    return {
        "scope": scope,
        "days": days,
        "totals": totals,
        "new_last_7d": new_last_7d,
        "findings_by_severity": findings_by_severity,
        "recent_findings": serialize_docs(findings_docs),
        "recent_alerts": serialize_docs(alerts_docs),
    }
