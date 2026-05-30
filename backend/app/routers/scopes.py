"""GET /api/scopes — scope names with per-collection document counts."""
import asyncio

from fastapi import APIRouter

from ..db import (
    ASSET_COLLECTIONS,
    DOMAINS,
    HTTP_PATHS,
    HTTP_PROBES,
    NUCLEI_HITS,
    NUCLEI_PASSIVE_HITS,
    PORTS,
    get_db,
)
from ..scopes import get_scope_names

router = APIRouter(prefix="/api", tags=["scopes"])

_COUNT_COLLECTIONS = ASSET_COLLECTIONS + [NUCLEI_HITS, NUCLEI_PASSIVE_HITS]


@router.get("/scopes")
async def list_scopes():
    db = get_db()
    names = await get_scope_names(force=True)

    async def counts_for(scope: str) -> dict:
        async def count(col: str) -> int:
            try:
                return await db[col].count_documents({"scope": scope})
            except Exception:
                return 0

        results = await asyncio.gather(*(count(c) for c in _COUNT_COLLECTIONS))
        by_col = dict(zip(_COUNT_COLLECTIONS, results))
        return {
            "name": scope,
            "counts": {
                "domains": by_col[DOMAINS],
                "http_probes": by_col[HTTP_PROBES],
                "ports": by_col[PORTS],
                "http_paths": by_col[HTTP_PATHS],
                # active + passive nuclei findings, surfaced as one number
                "findings": by_col[NUCLEI_HITS] + by_col[NUCLEI_PASSIVE_HITS],
            },
        }

    scopes = await asyncio.gather(*(counts_for(n) for n in names))
    return {"items": list(scopes), "total": len(scopes)}
