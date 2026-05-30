"""GET /api/alerts — notification history (telegram/smtp/vkteams log)."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query

from ..db import ALERTS, get_db
from ..query import Pagination, page_response, sort_spec
from ..serializers import serialize_docs

router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/alerts")
async def list_alerts(
    pg: Pagination = Depends(),
    source: str | None = Query(default=None, description="Filter by alert source"),
    days: int | None = Query(default=None, ge=0, description="Only alerts within N days"),
    sort: str | None = Query(default=None),
    order: str = Query(default="desc"),
):
    db = get_db()
    q: dict = {}
    if source:
        q["source"] = source
    if days:
        q["created_at"] = {"$gte": datetime.now() - timedelta(days=days)}

    spec = sort_spec(sort, order, ["created_at", "source"], "created_at")
    total = await db[ALERTS].count_documents(q)
    docs = await db[ALERTS].find(q).sort(spec).skip(pg.skip).limit(pg.limit).to_list(length=pg.limit)
    return page_response(serialize_docs(docs), total, pg)
