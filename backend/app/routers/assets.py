"""Asset list endpoints: /api/domains, /api/http_probes, /api/ports, /api/http_paths.

Each is paginated, sortable and filterable, and shares the temporal `base_filter`
(scope + alive/added windows) via the WindowParams dependency.
"""
from typing import Any

from fastapi import APIRouter, Depends, Query

from ..db import DOMAINS, HTTP_PATHS, HTTP_PROBES, PORTS, get_db
from ..deps import WindowParams
from ..filters import parse_filter
from ..query import Pagination, base_filter, page_response, regex_or, sort_spec
from ..scopes import get_scope_names
from ..serializers import serialize_docs

router = APIRouter(prefix="/api", tags=["assets"])


async def run_list(
    collection: str,
    extra: dict[str, Any],
    win: WindowParams,
    pg: Pagination,
    sort: str | None,
    order: str,
    allowed_sort: list[str],
    default_sort: str,
    advanced: dict | None = None,
) -> dict:
    """Shared list runner: base_filter + endpoint-specific filters, paginated.

    `advanced` is a pre-translated Mongo query from the structured filter builder;
    it is AND-ed on top of the temporal/quick filters.
    """
    db = get_db()
    scope_names = None if win.scope else await get_scope_names()
    q = base_filter(
        scope=win.scope,
        alive_days=win.alive_days,
        added_days=win.added_days,
        scope_names=scope_names,
    )
    # Merge endpoint-specific filters (drop None values).
    for k, v in extra.items():
        if v is not None:
            q[k] = v

    if advanced:
        q = {"$and": [q, advanced]}

    spec = sort_spec(sort, order, allowed_sort, default_sort)
    total = await db[collection].count_documents(q)
    cursor = db[collection].find(q).sort(spec).skip(pg.skip).limit(pg.limit)
    docs = await cursor.to_list(length=pg.limit)
    return page_response(serialize_docs(docs), total, pg)


# --- /api/domains ---------------------------------------------------------
@router.get("/domains")
async def list_domains(
    win: WindowParams = Depends(),
    pg: Pagination = Depends(),
    q: str | None = Query(default=None, description="Search host"),
    filter_: str | None = Query(default=None, alias="filter", description="Advanced filter tree (JSON)"),
    sort: str | None = Query(default=None),
    order: str = Query(default="desc"),
):
    extra: dict[str, Any] = {}
    if q:
        extra.update(regex_or(q, ["host"]))
    return await run_list(
        DOMAINS, extra, win, pg, sort, order,
        allowed_sort=["host", "add_date", "last_alive", "scope"],
        default_sort="last_alive",
        advanced=parse_filter(DOMAINS, filter_),
    )


# --- /api/http_probes -----------------------------------------------------
@router.get("/http_probes")
async def list_http_probes(
    win: WindowParams = Depends(),
    pg: Pagination = Depends(),
    status_code: int | None = Query(default=None),
    tech: str | None = Query(default=None, description="Match a technology in tech[]"),
    tls: bool | None = Query(default=None, description="Filter to TLS / non-TLS services"),
    q: str | None = Query(default=None, description="Search host/title/url/webserver"),
    filter_: str | None = Query(default=None, alias="filter", description="Advanced filter tree (JSON)"),
    sort: str | None = Query(default=None),
    order: str = Query(default="desc"),
):
    extra: dict[str, Any] = {}
    if status_code is not None:
        extra["status_code"] = status_code
    if tech:
        extra["tech"] = tech  # array membership
    if tls is True:
        extra["tls.probe_status"] = True
    elif tls is False:
        extra["tls.probe_status"] = {"$ne": True}
    if q:
        extra.update(regex_or(q, ["host", "title", "url", "webserver", "input"]))
    return await run_list(
        HTTP_PROBES, extra, win, pg, sort, order,
        allowed_sort=[
            "url", "host", "status_code", "last_alive", "add_date",
            "content_length", "port", "webserver", "scope",
        ],
        default_sort="last_alive",
        advanced=parse_filter(HTTP_PROBES, filter_),
    )


# --- /api/ports -----------------------------------------------------------
@router.get("/ports")
async def list_ports(
    win: WindowParams = Depends(),
    pg: Pagination = Depends(),
    host: str | None = Query(default=None),
    port: int | None = Query(default=None),
    q: str | None = Query(default=None, description="Search host/ip"),
    filter_: str | None = Query(default=None, alias="filter", description="Advanced filter tree (JSON)"),
    sort: str | None = Query(default=None),
    order: str = Query(default="desc"),
):
    extra: dict[str, Any] = {}
    if host:
        extra["host"] = host
    if port is not None:
        # port is stored as int in `ports`; accept the string form too.
        extra["port"] = {"$in": [port, str(port)]}
    if q:
        extra.update(regex_or(q, ["host", "ip"]))
    return await run_list(
        PORTS, extra, win, pg, sort, order,
        allowed_sort=["host", "port", "ip", "last_alive", "add_date", "scope"],
        default_sort="last_alive",
        advanced=parse_filter(PORTS, filter_),
    )


# --- /api/http_paths ------------------------------------------------------
@router.get("/http_paths")
async def list_http_paths(
    win: WindowParams = Depends(),
    pg: Pagination = Depends(),
    status_code: int | None = Query(default=None),
    q: str | None = Query(default=None, description="Search url/host/path"),
    filter_: str | None = Query(default=None, alias="filter", description="Advanced filter tree (JSON)"),
    sort: str | None = Query(default=None),
    order: str = Query(default="desc"),
):
    extra: dict[str, Any] = {}
    if status_code is not None:
        extra["status_code"] = status_code
    if q:
        extra.update(regex_or(q, ["url", "host", "path", "redirect"]))
    return await run_list(
        HTTP_PATHS, extra, win, pg, sort, order,
        allowed_sort=[
            "url", "host", "path", "status_code", "content_length",
            "last_alive", "add_date", "scope",
        ],
        default_sort="last_alive",
        advanced=parse_filter(HTTP_PATHS, filter_),
    )
