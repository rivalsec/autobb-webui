"""Shared query helpers: the temporal `base_filter` (mirroring export.py),
pagination, sorting, and regex search building.
"""
import re
from datetime import datetime, timedelta
from typing import Any

from fastapi import Query

from .config import settings

MAX_PAGE_SIZE = 200
DEFAULT_PAGE_SIZE = 50


def base_filter(
    scope: str | None = None,
    alive_days: int | None = None,
    added_days: int | None = None,
    scope_names: list[str] | None = None,
) -> dict[str, Any]:
    """Replicate export.py's query semantics.

    - `last_alive >= now - alive_days` (the "alive" window). The default window
      is settings.default_alive_days (30). Passing alive_days=0 disables the
      window to surface historical data.
    - `add_date >= now - added_days` when added_days is set (drives "new").
    - `scope == scope` when a single scope is given; otherwise restrict to the
      set of configured/known scope names (matching export.py's `$in`).
    """
    if alive_days is None:
        alive_days = settings.default_alive_days

    now = datetime.now()
    q: dict[str, Any] = {}

    if alive_days and alive_days > 0:
        q["last_alive"] = {"$gte": now - timedelta(days=alive_days)}

    if added_days:
        q["add_date"] = {"$gte": now - timedelta(days=added_days)}

    if scope:
        q["scope"] = scope
    elif scope_names:
        q["scope"] = {"$in": scope_names}

    return q


def regex_or(term: str, fields: list[str]) -> dict[str, Any]:
    """Case-insensitive substring search across several fields."""
    pattern = re.escape(term)
    rx = {"$regex": pattern, "$options": "i"}
    return {"$or": [{f: rx} for f in fields]}


def sort_spec(sort: str | None, order: str, allowed: list[str], default: str) -> list[tuple]:
    """Validate the requested sort field against an allowlist and return a
    Motor sort spec. Unknown fields fall back to `default`.
    """
    field = sort if sort in allowed else default
    direction = -1 if (order or "desc").lower() == "desc" else 1
    return [(field, direction)]


class Pagination:
    """Common pagination query params: page (1-based) + page_size (<=200)."""

    def __init__(
        self,
        page: int = Query(1, ge=1, description="1-based page number"),
        page_size: int = Query(
            DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="rows per page (max 200)"
        ),
    ):
        self.page = page
        self.page_size = page_size

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


def page_response(items: list, total: int, pg: Pagination) -> dict:
    return {
        "items": items,
        "total": total,
        "page": pg.page,
        "page_size": pg.page_size,
    }
