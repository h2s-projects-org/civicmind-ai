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


# ─── Serve Built Frontend Static Files in Production ────────────────────────

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Check for built frontend static files directory
static_dir = os.path.abspath("static")
if os.path.exists(static_dir):
    logger.info("✅ Built frontend directory found at %s — mounting assets", static_dir)
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve favicon, manifest, etc. directly if they exist at static root
    # Fallback route to serve index.html for React SPA client-side routing
    @app.get("/{fallback_path:path}", include_in_schema=False)
    async def frontend_fallback(fallback_path: str):
        # Exclude API endpoints, docs, and schema definitions from fallback
        if (
            fallback_path.startswith("api")
            or fallback_path.startswith("docs")
            or fallback_path.startswith("redoc")
            or fallback_path.startswith("openapi.json")
        ):
            return JSONResponse(status_code=404, content={"detail": "Not found"})

        # Serve static file directly if it exists at root level (e.g. favicon.svg)
        file_path = os.path.join(static_dir, fallback_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        # Fallback to SPA index.html
        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Frontend assets not found"})
else:
    logger.info("ℹ️  No static frontend directory found — API-only mode active")


# ─── Root Health Check ──────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint — basic application health check."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "operational",
    }

