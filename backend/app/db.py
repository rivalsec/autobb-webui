"""MongoDB access layer (Motor, async).

The API is strictly read-only: this module never exposes write helpers, and the
pipeline remains the sole writer. Collection names mirror autobb's schema.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import settings

# Asset / finding collections (autobb schema).
DOMAINS = "domains"
HTTP_PROBES = "http_probes"
PORTS = "ports"
HTTP_PATHS = "http_paths"
NUCLEI_HITS = "nuclei_hits"
NUCLEI_PASSIVE_HITS = "nuclei_passive_hits"
SECRET_HITS = "secret_hits"
ALERTS = "alerts"

# Collections that carry the standard (scope, add_date, last_alive) temporal model.
ASSET_COLLECTIONS = [DOMAINS, HTTP_PROBES, PORTS, HTTP_PATHS]

_client: AsyncIOMotorClient | None = None


def connect() -> None:
    """Open the Motor client. Called once on startup."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)


def close() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


def get_db() -> AsyncIOMotorDatabase:
    if _client is None:
        connect()
    return _client[settings.mongo_db]
