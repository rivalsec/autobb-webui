"""GET /api/secrets — gitleaks secret hits (the `secret_hits` collection).

Passive secret scan results. Like the asset collections, each hit carries the
standard temporal model (`scope`/`add_date`/`last_alive`), so it reuses the
shared `run_list` runner and the alive/added window. Unlike assets it also has a
nuclei-style `severity`, exposed here as a quick filter.
"""
from typing import Any

from fastapi import APIRouter, Depends, Query

from ..db import SECRET_HITS
from ..deps import WindowParams
from ..filters import parse_filter
from ..query import Pagination, regex_or
from .assets import run_list

router = APIRouter(prefix="/api", tags=["secrets"])


@router.get("/secrets")
async def list_secrets(
    win: WindowParams = Depends(),
    pg: Pagination = Depends(),
    severity: str | None = Query(default=None, description="critical / high / medium / low / info / unknown"),
    rule_id: str | None = Query(default=None, description="gitleaks rule id"),
    q: str | None = Query(default=None, description="Search rule/description/match/host/url"),
    filter_: str | None = Query(default=None, alias="filter", description="Advanced filter tree (JSON)"),
    sort: str | None = Query(default=None),
    order: str = Query(default="desc"),
):
    extra: dict[str, Any] = {}
    if severity:
        extra["severity"] = severity
    if rule_id:
        extra["rule_id"] = rule_id
    if q:
        extra.update(regex_or(q, ["rule_id", "description", "match", "host", "url"]))
    return await run_list(
        SECRET_HITS, extra, win, pg, sort, order,
        allowed_sort=["host", "rule_id", "line", "last_alive", "add_date", "scope"],
        default_sort="last_alive",
        advanced=parse_filter(SECRET_HITS, filter_),
    )
