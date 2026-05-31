"""GET /api/schema/{collection} — filterable field schema for the UI builder.

Single source of truth: the same SCHEMAS that the filter translator validates
against, so the builder can never offer a field/operator the backend rejects.
"""
from fastapi import APIRouter, HTTPException

from ..filters import FilterError, schema_fields

router = APIRouter(prefix="/api", tags=["schema"])


@router.get("/schema/{collection}")
async def get_schema(collection: str):
    try:
        return {"collection": collection, "fields": schema_fields(collection)}
    except FilterError:
        raise HTTPException(status_code=404, detail=f"no schema for '{collection}'")
