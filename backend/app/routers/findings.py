"""GET /api/findings — nuclei hits (active + passive) merged.

The two nuclei collections share a schema (passive adds `port`/`path`) and, in
the autobb DB, both carry the standard temporal model (`add_date`/`last_alive`),
so the shared alive/added window applies here just like the asset endpoints.

Each collection is filtered + sorted server-side (date fields directly; severity
via a computed rank). We then fetch the first `skip+limit` of each, merge, and
slice the requested page — correct union pagination without loading everything.
"""
import asyncio
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query

from ..db import NUCLEI_HITS, NUCLEI_PASSIVE_HITS, get_db
from ..deps import WindowParams
from ..query import Pagination, base_filter, page_response, regex_or
from ..scopes import get_scope_names
from ..serializers import serialize_docs

router = APIRouter(prefix="/api", tags=["findings"])

# Highest first. Used for the severity sort and severity vocabulary.
SEVERITY_RANK = {"critical": 5, "high": 4, "medium": 3, "low": 2, "info": 1, "unknown": 0}
_DATE_FIELDS = {"add_date", "last_alive"}
_STR_FIELDS = {"template-id", "host", "matched-at", "type"}
_SORTABLE = _DATE_FIELDS | _STR_FIELDS | {"severity"}
# Bound the per-collection fetch so a deep page can't pull the whole collection.
_FETCH_CAP = 5000


def _extra_filter(severity: str | None, template_id: str | None, q: str | None) -> dict[str, Any]:
    f: dict[str, Any] = {}
    if severity:
        f["info.severity"] = severity
    if template_id:
        f["template-id"] = template_id
    if q:
        f.update(regex_or(q, ["template-id", "matched-at", "host", "info.name"]))
    return f


def _sev_rank_expr() -> dict:
    sev = {"$toLower": {"$ifNull": ["$info.severity", "unknown"]}}
    branches = [{"case": {"$eq": [sev, k]}, "then": v} for k, v in SEVERITY_RANK.items() if k != "unknown"]
    return {"$switch": {"branches": branches, "default": 0}}


@router.get("/findings")
async def list_findings(
    win: WindowParams = Depends(),
    pg: Pagination = Depends(),
    severity: str | None = Query(default=None, description="info / low / medium / high / critical"),
    template_id: str | None = Query(default=None),
    passive: bool | None = Query(
        default=None, description="true=passive only, false=active only, omit=both"
    ),
    q: str | None = Query(default=None, description="Search template-id/matched-at/host/name"),
    sort: str = Query(default="add_date", description="add_date|last_alive|severity|template-id|host"),
    order: str = Query(default="desc"),
):
    db = get_db()
    scope_names = None if win.scope else await get_scope_names()
    flt = base_filter(win.scope, alive_days=win.alive_days, added_days=win.added_days, scope_names=scope_names)
    flt.update(_extra_filter(severity, template_id, q))

    sort_field = sort if sort in _SORTABLE else "add_date"
    direction = -1 if order.lower() == "desc" else 1
    sort_key_db = "_sevrank" if sort_field == "severity" else sort_field

    if passive is None:
        sources = [(NUCLEI_HITS, False), (NUCLEI_PASSIVE_HITS, True)]
    elif passive:
        sources = [(NUCLEI_PASSIVE_HITS, True)]
    else:
        sources = [(NUCLEI_HITS, False)]

    fetch_n = min(pg.skip + pg.limit, _FETCH_CAP)

    async def from_source(col: str, is_passive: bool):
        pipeline = [
            {"$match": flt},
            {
                "$addFields": {
                    "_sevrank": _sev_rank_expr(),
                    "passive": is_passive,
                    "severity": {"$toLower": {"$ifNull": ["$info.severity", "unknown"]}},
                }
            },
            {"$sort": {sort_key_db: direction, "_id": direction}},
            {"$limit": fetch_n},
        ]
        total, docs = await asyncio.gather(
            db[col].count_documents(flt),
            db[col].aggregate(pipeline, allowDiskUse=True).to_list(length=fetch_n),
        )
        return total, docs

    results = await asyncio.gather(*(from_source(c, p) for c, p in sources))
    total = sum(t for t, _ in results)
    merged: list[dict] = []
    for _, docs in results:
        merged.extend(docs)

    def sort_key(d: dict):
        if sort_field == "severity":
            primary: Any = d.get("_sevrank", 0)
        else:
            primary = d.get(sort_field)
            if primary is None:
                primary = datetime.min if sort_field in _DATE_FIELDS else ""
        return (primary, str(d.get("_id", "")))

    merged.sort(key=sort_key, reverse=(direction == -1))
    page_slice = merged[pg.skip : pg.skip + pg.limit]
    for d in page_slice:
        d.pop("_sevrank", None)
    return page_response(serialize_docs(page_slice), total, pg)
