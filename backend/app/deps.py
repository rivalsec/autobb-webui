"""Reusable FastAPI dependencies shared across asset endpoints."""
from fastapi import Query

from .config import settings


class WindowParams:
    """The global temporal controls every asset endpoint accepts.

    - scope: restrict to a single scope (else: all configured/known scopes).
    - alive_days: the "alive" window. Defaults to settings.default_alive_days.
    - added_days: restrict to assets first seen within N days ("new").
    - all_: when true, disables the alive window (historical view), matching the
      spec's `all=true` flag / alive_days=0 behaviour.
    """

    def __init__(
        self,
        scope: str | None = Query(default=None, description="Scope name; omit for all scopes"),
        alive_days: int | None = Query(
            default=None, ge=0, description="Alive window in days (0 disables)"
        ),
        added_days: int | None = Query(
            default=None, ge=0, description="Only assets first seen within N days"
        ),
        all_: bool = Query(
            default=False, alias="all", description="Disable the alive window (show all history)"
        ),
    ):
        self.scope = scope
        self.all = all_
        if all_:
            self.alive_days = 0
        elif alive_days is None:
            self.alive_days = settings.default_alive_days
        else:
            self.alive_days = alive_days
        self.added_days = added_days or None
