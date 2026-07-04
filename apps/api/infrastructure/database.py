"""
CivicMind AI — Database Infrastructure

Configures SQLAlchemy async connection pooling for PostgreSQL (transactional
logs, alerts, recommendations) and sets up a BigQuery client for the data
warehouse layer. Uses dependency injection via FastAPI's Depends().
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from apps.api.config import get_settings

settings = get_settings()

# ─── SQLAlchemy Async Engine & Session ──────────────────────────────────────
engine = create_async_engine(
    settings.postgres_dsn,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session.

    Usage::
        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ─── BigQuery Client (Lazy Initialization) ──────────────────────────────────

_bq_client: Optional[object] = None


def get_bigquery_client():
    """Return a cached BigQuery client instance.

    Lazily imported to avoid hard dependency when BigQuery is not configured.
    Returns None if the GCP project ID is not set.
    """
    global _bq_client
    if _bq_client is not None:
        return _bq_client

    if not settings.gcp_project_id:
        return None

    try:
        from google.cloud import bigquery
        _bq_client = bigquery.Client(project=settings.gcp_project_id)
        return _bq_client
    except ImportError:
        import logging
        logging.warning(
            "google-cloud-bigquery is not installed. "
            "BigQuery features will be unavailable."
        )
        return None
    except Exception as exc:
        import logging
        logging.error("Failed to initialize BigQuery client: %s", exc)
        return None


# ─── GCS Client (Lazy Initialization) ───────────────────────────────────────

_gcs_client: Optional[object] = None


def get_gcs_client():
    """Return a cached Google Cloud Storage client instance."""
    global _gcs_client
    if _gcs_client is not None:
        return _gcs_client

    if not settings.gcp_project_id:
        return None

    try:
        from google.cloud import storage
        _gcs_client = storage.Client(project=settings.gcp_project_id)
        return _gcs_client
    except ImportError:
        import logging
        logging.warning(
            "google-cloud-storage is not installed. "
            "GCS features will be unavailable."
        )
        return None
    except Exception as exc:
        import logging
        logging.error("Failed to initialize GCS client: %s", exc)
        return None


# ─── Database Lifecycle Helpers ─────────────────────────────────────────────

async def init_db():
    """Create all tables in the database (for development/testing)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Dispose of the engine connection pool."""
    await engine.dispose()
