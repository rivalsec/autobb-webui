"""Serialize raw MongoDB documents into JSON-safe structures.

autobb stores documents with heterogeneous types: `_id` may be an ObjectId or a
plain hex string, timestamps are stored as `datetime`, and nuclei collections
use hyphenated keys (passed through as-stored). We normalise `_id` -> string and
`datetime` -> ISO-8601 recursively so FastAPI can emit them as JSON.
"""
from datetime import date, datetime
from typing import Any

from bson import ObjectId


def jsonify(value: Any) -> Any:
    """Recursively convert BSON/Mongo values into JSON-serialisable Python."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: jsonify(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonify(v) for v in value]
    if isinstance(value, bytes):
        return value.decode("utf-8", "replace")
    return value


def serialize_doc(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    out = jsonify(doc)
    # Normalise the Mongo id to a stable string field the SPA can key on.
    if "_id" in out:
        out["id"] = str(out["_id"])
        del out["_id"]
    return out


def serialize_docs(docs: list[dict]) -> list[dict]:
    return [serialize_doc(d) for d in docs]
