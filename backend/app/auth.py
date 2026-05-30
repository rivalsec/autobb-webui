"""Single shared auth gate (v1).

If AUTH_TOKEN is configured, every /api request must present it via either
`Authorization: Bearer <token>` or `X-Auth-Token: <token>`. If AUTH_TOKEN is
empty, auth is disabled (development only). No multi-user / RBAC in v1.
"""
import secrets

from fastapi import Header, HTTPException, status

from .config import settings


def _extract(authorization: str | None, x_auth_token: str | None) -> str | None:
    if x_auth_token:
        return x_auth_token
    if authorization:
        parts = authorization.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1].strip()
        return authorization.strip()
    return None


async def require_auth(
    authorization: str | None = Header(default=None),
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> None:
    """FastAPI dependency enforcing the shared token when auth is enabled."""
    if not settings.auth_enabled:
        return
    token = _extract(authorization, x_auth_token)
    if not token or not secrets.compare_digest(token, settings.auth_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing auth token",
            headers={"WWW-Authenticate": "Bearer"},
        )
