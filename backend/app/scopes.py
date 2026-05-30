"""Resolve the canonical list of scope names.

Two sources, in priority order:
  1. SCOPES_CONFIG — an autobb-style YAML (`scope: [{name: ...}, ...]`, with the
     optional `!include` constructor used by config.yaml). Parsed read-only.
  2. Distinct `scope` values across the asset collections (default).

Results are cached with a short TTL so /api/scopes and base_filter stay cheap.
"""
import os
import time

import yaml

from .config import settings
from .db import ASSET_COLLECTIONS, NUCLEI_HITS, NUCLEI_PASSIVE_HITS, get_db

_CACHE_TTL = 60.0
_cache: dict = {"names": None, "ts": 0.0}


class _IncludeLoader(yaml.SafeLoader):
    """SafeLoader that understands autobb's `!include` (best-effort, read-only)."""

    def __init__(self, stream):
        self._root = os.path.dirname(getattr(stream, "name", "") or ".")
        super().__init__(stream)


def _construct_include(loader: "_IncludeLoader", node):
    filename = os.path.abspath(os.path.join(loader._root, loader.construct_scalar(node)))
    ext = os.path.splitext(filename)[1].lstrip(".")
    with open(filename, "r") as f:
        if ext in ("yaml", "yml"):
            return yaml.load(f, _IncludeLoader)
        return f.read()


_IncludeLoader.add_constructor("!include", _construct_include)


def _names_from_config(path: str) -> list[str]:
    with open(path, "r") as f:
        data = yaml.load(f, _IncludeLoader)
    scopes = data.get("scope", []) if isinstance(data, dict) else data
    names = []
    for s in scopes or []:
        if isinstance(s, dict) and s.get("name"):
            names.append(s["name"])
    return names


async def _names_from_db() -> list[str]:
    db = get_db()
    names: set[str] = set()
    for col in ASSET_COLLECTIONS + [NUCLEI_HITS, NUCLEI_PASSIVE_HITS]:
        try:
            for v in await db[col].distinct("scope"):
                if v:
                    names.add(v)
        except Exception:
            continue
    return sorted(names)


async def get_scope_names(force: bool = False) -> list[str]:
    now = time.monotonic()
    if not force and _cache["names"] is not None and (now - _cache["ts"]) < _CACHE_TTL:
        return _cache["names"]

    names: list[str] = []
    if settings.scopes_config:
        try:
            names = _names_from_config(settings.scopes_config)
        except Exception:
            names = []
    if not names:
        names = await _names_from_db()

    _cache["names"] = names
    _cache["ts"] = now
    return names
