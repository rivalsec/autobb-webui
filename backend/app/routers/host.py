"""GET /api/host/{host} — drilldown stitching every collection for one target."""
import asyncio

from fastapi import APIRouter

from ..db import (
    DOMAINS,
    HTTP_PATHS,
    HTTP_PROBES,
    NUCLEI_HITS,
    NUCLEI_PASSIVE_HITS,
    PORTS,
    SECRET_HITS,
    get_db,
)
from ..serializers import serialize_doc, serialize_docs

router = APIRouter(prefix="/api", tags=["host"])

_FAN_LIMIT = 1000


@router.get("/host/{host}")
async def host_detail(host: str):
    db = get_db()

    async def find(col: str, q: dict):
        return await db[col].find(q).limit(_FAN_LIMIT).to_list(length=_FAN_LIMIT)

    domain_doc, probes, ports, paths, active, passive, secrets = await asyncio.gather(
        db[DOMAINS].find_one({"host": host}),
        find(HTTP_PROBES, {"host": host}),
        find(PORTS, {"host": host}),
        find(HTTP_PATHS, {"host": host}),
        find(NUCLEI_HITS, {"host": host}),
        find(NUCLEI_PASSIVE_HITS, {"host": host}),
        find(SECRET_HITS, {"host": host}),
    )

    for d in active:
        d["passive"] = False
        d["severity"] = ((d.get("info") or {}).get("severity") or "unknown").lower()
    for d in passive:
        d["passive"] = True
        d["severity"] = ((d.get("info") or {}).get("severity") or "unknown").lower()
    findings = active + passive

    return {
        "host": host,
        "domain": serialize_doc(domain_doc),
        "probes": serialize_docs(probes),
        "ports": serialize_docs(ports),
        "findings": serialize_docs(findings),
        "paths": serialize_docs(paths),
        "secrets": serialize_docs(secrets),
    }
