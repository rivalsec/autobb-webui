"""Advanced filter: translate a structured JSON filter *tree* into a MongoDB
query, validated against a per-collection field schema.

The frontend builds the tree (groups of conditions, arbitrarily nested), so there
is no DSL to parse. Safety comes from the schema: only known fields, only
operators allowed for a field's type, values coerced to that type (objects/lists
rejected), all regexes escaped (literal `contains`, no ReDoS), and depth/size
caps. The connection is read-only; nothing here can mutate data.

Tree shape:
    group     = { "op": "and"|"or", "rules": [node, ...] }
    condition = { "field": str, "operator": str, "value": <scalar> }   # value omitted for exists/not_exists
"""
import json
import re
from datetime import datetime, timedelta

from fastapi import HTTPException

from .db import DOMAINS, HTTP_PATHS, HTTP_PROBES, PORTS, SECRET_HITS

MAX_DEPTH = 5
MAX_CONDITIONS = 50

# Allowed operators per field type. UI mirrors this via the schema endpoint.
OPS_BY_TYPE: dict[str, list[str]] = {
    "string": ["eq", "ne", "contains", "not_contains", "matches", "not_matches", "exists", "not_exists"],
    "number": ["eq", "ne", "gt", "gte", "lt", "lte", "exists", "not_exists"],
    "date": ["eq", "gt", "gte", "lt", "lte", "exists", "not_exists"],
    "bool": ["eq", "exists", "not_exists"],
    "string[]": ["contains", "not_contains", "matches", "not_matches", "eq", "ne", "exists", "not_exists"],
}

# Cap user-supplied regex length to limit catastrophic-backtracking (ReDoS) risk
# against the shared Mongo. Patterns are also compile-checked for clear errors.
MAX_REGEX_LEN = 200

_NO_VALUE = {"exists", "not_exists"}


class FilterError(Exception):
    """Bad filter (unknown field, illegal operator, uncoercible value, …)."""


def _f(label: str, ftype: str, path: str | None = None) -> dict:
    return {"label": label, "type": ftype, "path": path or None}


# Curated, per-collection filterable schema (from the real autobb doc shapes).
SCHEMAS: dict[str, dict[str, dict]] = {
    HTTP_PATHS: {
        "url": _f("URL", "string"),
        "host": _f("Host", "string"),
        "path": _f("Path", "string"),
        "redirect": _f("Redirect", "string"),
        "status_code": _f("Status code", "number"),
        "content_length": _f("Size", "number"),
        "words": _f("Words", "number"),
        "lines": _f("Lines", "number"),
        "scope": _f("Scope", "string"),
        "add_date": _f("First seen", "date"),
        "last_alive": _f("Last alive", "date"),
    },
    HTTP_PROBES: {
        "url": _f("URL", "string"),
        "host": _f("Host", "string"),
        "scheme": _f("Scheme", "string"),
        "port": _f("Port", "number"),
        "status_code": _f("Status code", "number"),
        "title": _f("Title", "string"),
        "webserver": _f("Web server", "string"),
        "content_type": _f("Content type", "string"),
        "method": _f("Method", "string"),
        "input": _f("Input", "string"),
        "content_length": _f("Size", "number"),
        "words": _f("Words", "number"),
        "lines": _f("Lines", "number"),
        "tech": _f("Tech", "string[]"),
        "a": _f("IP", "string[]"),
        "cnames": _f("CNAME", "string[]"),
        "hash": _f("Content hash", "string"),
        "tls": _f("TLS", "bool", "tls.probe_status"),
        "scope": _f("Scope", "string"),
        "add_date": _f("First seen", "date"),
        "last_alive": _f("Last alive", "date"),
    },
    DOMAINS: {
        "host": _f("Host", "string"),
        "a": _f("IP", "string[]"),
        "cname": _f("CNAME", "string[]"),
        "juicy_weight": _f("Juicy weight", "number"),
        "scope": _f("Scope", "string"),
        "add_date": _f("First seen", "date"),
        "last_alive": _f("Last alive", "date"),
    },
    PORTS: {
        "host": _f("Host", "string"),
        "ip": _f("IP", "string"),
        "port": _f("Port", "number"),
        "scope": _f("Scope", "string"),
        "add_date": _f("First seen", "date"),
        "last_alive": _f("Last alive", "date"),
    },
    SECRET_HITS: {
        "host": _f("Host", "string"),
        "url": _f("URL", "string"),
        "rule_id": _f("Rule", "string"),
        "severity": _f("Severity", "string"),
        "description": _f("Description", "string"),
        "match": _f("Match", "string"),
        "secret": _f("Secret", "string"),
        "file": _f("File", "string"),
        "line": _f("Line", "number"),
        "scope": _f("Scope", "string"),
        "add_date": _f("First seen", "date"),
        "last_alive": _f("Last alive", "date"),
    },
}


def schema_fields(collection: str) -> list[dict]:
    """Field descriptors for the builder UI (name, label, type, operators)."""
    schema = SCHEMAS.get(collection)
    if schema is None:
        raise FilterError(f"no schema for '{collection}'")
    return [
        {"name": name, "label": fd["label"], "type": fd["type"], "operators": OPS_BY_TYPE[fd["type"]]}
        for name, fd in schema.items()
    ]


# --- value coercion ------------------------------------------------------
_REL_RE = re.compile(r"^(\d+)\s*([dh])$", re.IGNORECASE)


def _coerce_number(v):
    if isinstance(v, bool):
        raise FilterError("expected a number")
    if isinstance(v, (int, float)):
        return v
    if isinstance(v, str):
        s = v.strip()
        try:
            return int(s)
        except ValueError:
            try:
                return float(s)
            except ValueError:
                raise FilterError(f"'{v}' is not a number")
    raise FilterError("expected a number")


def _coerce_bool(v):
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        if v.strip().lower() in ("true", "1", "yes"):
            return True
        if v.strip().lower() in ("false", "0", "no"):
            return False
    if v in (0, 1):
        return bool(v)
    raise FilterError("expected true/false")


def _coerce_date(v):
    """ISO date/datetime, or relative `Nd`/`Nh` meaning now − N (days/hours)."""
    if isinstance(v, str):
        s = v.strip()
        m = _REL_RE.match(s)
        if m:
            n = int(m.group(1))
            unit = m.group(2).lower()
            return datetime.now() - (timedelta(days=n) if unit == "d" else timedelta(hours=n))
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(s)
        except ValueError:
            pass
    raise FilterError(f"'{v}' is not a date (use YYYY-MM-DD or e.g. 7d)")


def _coerce_string(v):
    if isinstance(v, (dict, list)):
        raise FilterError("expected a string")
    return str(v)


_COERCE = {
    "number": _coerce_number,
    "bool": _coerce_bool,
    "date": _coerce_date,
    "string": _coerce_string,
    "string[]": _coerce_string,
}


def _regex(value: str) -> dict:
    # Escaped → literal substring, case-insensitive. No injection, no ReDoS.
    return {"$regex": re.escape(value), "$options": "i"}


def _user_regex(value: str) -> dict:
    """Raw user regex for `matches`/`not_matches` — value is a pattern, NOT escaped.

    Case-sensitive by default (use inline `(?i)` for case-insensitive). Validated:
    length-capped and compile-checked so a bad pattern returns 400, not a Mongo
    error or a runaway scan.
    """
    if len(value) > MAX_REGEX_LEN:
        raise FilterError(f"regex too long (max {MAX_REGEX_LEN} chars)")
    try:
        re.compile(value)
    except re.error as e:
        raise FilterError(f"invalid regex: {e}")
    return {"$regex": value}


def _translate_condition(cond: dict, schema: dict) -> dict:
    field = cond.get("field")
    op = cond.get("operator")
    if not isinstance(field, str) or field not in schema:
        raise FilterError(f"unknown field '{field}'")
    fd = schema[field]
    ftype = fd["type"]
    path = fd["path"] or field
    if op not in OPS_BY_TYPE[ftype]:
        raise FilterError(f"operator '{op}' not allowed on '{field}'")

    if op == "exists":
        return {path: {"$exists": True}}
    if op == "not_exists":
        return {path: {"$exists": False}}

    if "value" not in cond or cond["value"] is None or cond["value"] == "":
        raise FilterError(f"missing value for '{field}'")
    val = _COERCE[ftype](cond["value"])

    # `port` is stored as int in `ports` but as a string in `http_probes`;
    # match both forms for equality so a single filter works across the app.
    if field == "port" and op in ("eq", "ne"):
        try:
            forms = [int(val), str(int(val))]
        except (TypeError, ValueError):
            forms = [val, str(val)]
        return {path: {"$in": forms}} if op == "eq" else {path: {"$nin": forms}}

    return {
        "eq": lambda: {path: val},
        "ne": lambda: {path: {"$ne": val}},
        "contains": lambda: {path: _regex(val)},
        "not_contains": lambda: {path: {"$not": _regex(val)}},
        "matches": lambda: {path: _user_regex(val)},
        "not_matches": lambda: {path: {"$not": _user_regex(val)}},
        "gt": lambda: {path: {"$gt": val}},
        "gte": lambda: {path: {"$gte": val}},
        "lt": lambda: {path: {"$lt": val}},
        "lte": lambda: {path: {"$lte": val}},
    }[op]()


def _build(node, schema: dict, depth: int, counter: list[int]):
    if not isinstance(node, dict):
        raise FilterError("invalid filter node")

    if "op" in node and "rules" in node:
        op = node["op"]
        if op not in ("and", "or"):
            raise FilterError(f"invalid group operator '{op}'")
        if depth >= MAX_DEPTH:
            raise FilterError("filter is too deeply nested")
        rules = node["rules"]
        if not isinstance(rules, list):
            raise FilterError("group 'rules' must be a list")
        clauses = []
        for r in rules:
            c = _build(r, schema, depth + 1, counter)
            if c:
                clauses.append(c)
        if not clauses:
            return None
        return {f"${op}": clauses}

    counter[0] += 1
    if counter[0] > MAX_CONDITIONS:
        raise FilterError("too many conditions")
    return _translate_condition(node, schema)


def build_mongo(collection: str, tree) -> dict | None:
    schema = SCHEMAS.get(collection)
    if schema is None:
        raise FilterError(f"no schema for '{collection}'")
    return _build(tree, schema, 0, [0])


def parse_filter(collection: str, raw: str | None) -> dict | None:
    """Parse the `filter` query param (URL-encoded JSON) into a Mongo query.

    Returns None when empty. Raises HTTP 400 on malformed JSON or invalid filter.
    """
    if not raw:
        return None
    try:
        tree = json.loads(raw)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="filter is not valid JSON")
    try:
        return build_mongo(collection, tree)
    except FilterError as e:
        raise HTTPException(status_code=400, detail=f"filter error: {e}")
