"""
CivicMind AI — FastAPI Application Entry Point

Initializes the FastAPI application, configures CORS middleware,
registers router paths, and manages the application lifecycle
(database connections, BigQuery client initialization).
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from apps.api.config import get_settings
from apps.api.routers import auth, datasets

settings = get_settings()

# ─── Logging Configuration ──────────────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("civicmind")


# ─── Application Lifecycle ──────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown lifecycle events."""
    logger.info("🚀 CivicMind AI starting up...")
    logger.info("Environment: %s", settings.environment)
    logger.info("Debug mode: %s", settings.debug)

    # Initialize database connections (if Postgres is configured)
    try:
        from apps.api.infrastructure.database import init_db

        await init_db()
        logger.info("✅ PostgreSQL database initialized")
    except Exception as exc:
        logger.warning(
            "⚠️  PostgreSQL not available (running in standalone mode): %s", exc
        )

    # Check GPU availability
    from apps.api.services.analytics import is_gpu_available

    if is_gpu_available():
        logger.info("✅ NVIDIA GPU detected — cuDF acceleration enabled")
    else:
        logger.info("ℹ️  No GPU detected — using standard Pandas fallback")

    # Check Gemini API
    if settings.gemini_api_key:
        logger.info("✅ Gemini API key configured")
    else:
        logger.warning("⚠️  GEMINI_API_KEY not set — AI features will use fallback responses")

    yield  # Application runs

    # Cleanup
    logger.info("🛑 CivicMind AI shutting down...")
    try:
        from apps.api.infrastructure.database import close_db

        await close_db()
    except Exception:
        pass


# ─── FastAPI Application ───────────────────────────────────────────────────

app = FastAPI(
    title="CivicMind AI",
    description=(
        "AI-Powered Community Decision Intelligence Platform — "
        "Transform fragmented operational data into actionable intelligence "
        "using Google Cloud, Gemini AI, NVIDIA GPU acceleration, and modern analytics."
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# ─── CORS Middleware ────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)


# ─── Request Timing Middleware ──────────────────────────────────────────────

@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    """Add X-Process-Time header to all responses for observability."""
    start = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response


# ─── Global Exception Handler ──────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Centralized exception handler for unhandled errors."""
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred",
        },
    )


# ─── Register Routers ──────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(datasets.router)


# ─── Root Health Check ──────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint — basic application health check."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "operational",
    }
