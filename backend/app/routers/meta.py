"""Public meta endpoints: health + auth discovery + token check.

These are intentionally NOT behind the auth gate so the SPA can discover whether
a token is required and validate one before loading data.
"""
from fastapi import APIRouter, Depends

from ..auth import require_auth
from ..config import settings
from ..db import get_db

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health")
async def health():
    db = get_db()
    try:
        await db.command("ping")
        mongo_ok = True
    except Exception:
        mongo_ok = False
    return {"status": "ok", "mongo": mongo_ok, "db": settings.mongo_db}


@router.get("/auth/config")
async def auth_config():
    """Public: tells the SPA whether to prompt for a token."""
    return {"auth_required": settings.auth_enabled}


@router.get("/auth/check", dependencies=[Depends(require_auth)])
async def auth_check():
    """Validates the supplied token (401 if invalid when auth is enabled)."""
    return {"ok": True}
