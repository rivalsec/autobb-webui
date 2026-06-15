"""AutoBB Web UI — FastAPI application entrypoint.

Read-only dashboard API over autobb's MongoDB. All data routers sit behind the
shared auth gate; meta endpoints (health / auth discovery) stay public so the
SPA can bootstrap. When a built frontend exists it is served from the same
origin.
"""
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .auth import require_auth
from .config import settings
from .db import close, connect
from .routers import alerts, assets, findings, host, meta, schema, scopes, secrets, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    connect()
    yield
    close()


app = FastAPI(
    title="AutoBB Web UI API",
    version="1.0.0",
    description="Read-only dashboard API over the autobb recon MongoDB.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Authorization", "X-Auth-Token", "Content-Type"],
)

# Public meta endpoints (no auth gate).
app.include_router(meta.router)

# Data endpoints — all behind the shared auth gate.
_guard = [Depends(require_auth)]
app.include_router(scopes.router, dependencies=_guard)
app.include_router(stats.router, dependencies=_guard)
app.include_router(schema.router, dependencies=_guard)
app.include_router(assets.router, dependencies=_guard)
app.include_router(findings.router, dependencies=_guard)
app.include_router(secrets.router, dependencies=_guard)
app.include_router(host.router, dependencies=_guard)
app.include_router(alerts.router, dependencies=_guard)


class SPAStaticFiles(StaticFiles):
    """StaticFiles that falls back to index.html for unknown client-side routes
    (BrowserRouter deep links like /findings), while leaving /api 404s alone."""

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404 and not path.startswith("api"):
                return await super().get_response("index.html", scope)
            raise


def _mount_spa() -> None:
    """Serve the built SPA at / when the dist directory exists (single-origin)."""
    dist = settings.frontend_dist
    if not os.path.isabs(dist):
        dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), dist)
    if os.path.isdir(dist):
        app.mount("/", SPAStaticFiles(directory=dist, html=True), name="spa")


_mount_spa()
