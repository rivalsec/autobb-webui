"""Application settings, loaded from environment / .env.

A single MONGO_URI + MONGO_DB drive the read-only connection. Everything else
has a safe default so the API can boot against a local autobb MongoDB with no
configuration at all.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # MongoDB (read-only connection)
    mongo_uri: str = "mongodb://127.0.0.1:27017"
    mongo_db: str = "autobbdb"

    # Temporal model — default "alive" window, mirroring export.py.
    default_alive_days: int = 30

    # Auth gate. Empty => auth disabled (development only).
    auth_token: str = ""

    # CORS — comma-separated allowed origins for the SPA.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Networking — never bind to a public interface by default.
    host: str = "127.0.0.1"
    port: int = 8000

    # Optional: serve the built SPA from FastAPI when this path exists.
    frontend_dist: str = "../frontend/dist"

    # Optional: path to an autobb-style scopes/config YAML for the scope list.
    scopes_config: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def auth_enabled(self) -> bool:
        return bool(self.auth_token)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
