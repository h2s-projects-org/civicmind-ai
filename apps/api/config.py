"""
CivicMind AI — Configuration Module

Centralizes all environment variable access and application settings
using Pydantic BaseSettings for type-safe configuration management.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ─── Application ───────────────────────────────────────────────────
    app_name: str = "CivicMind AI"
    app_version: str = "2.0.0"
    debug: bool = False
    environment: str = "development"

    # ─── Security & Authentication ─────────────────────────────────────
    secret_key: str = "change-me-in-production-use-a-256-bit-key"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # ─── CORS ──────────────────────────────────────────────────────────
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ─── Database — PostgreSQL ─────────────────────────────────────────
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "civicmind"
    postgres_password: str = "civicmind"
    postgres_db: str = "civicmind"

    @property
    def postgres_dsn(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def postgres_dsn_sync(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ─── Database — Redis ──────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ─── Google Cloud ──────────────────────────────────────────────────
    gcp_project_id: Optional[str] = None
    gcp_bigquery_dataset: str = "civicmind_warehouse"
    gcp_storage_bucket: Optional[str] = None

    # ─── Gemini / Vertex AI ────────────────────────────────────────────
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"

    # ─── NVIDIA GPU Configuration ──────────────────────────────────────
    enable_gpu_acceleration: bool = False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache()
def get_settings() -> Settings:
    """Return a cached singleton of application settings."""
    return Settings()
