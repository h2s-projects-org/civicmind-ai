# ═══════════════════════════════════════════════════════════════════════════
# CivicMind AI — Cloud Run Dockerfile
# Single container: FastAPI backend + built React frontend
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build React Frontend ───────────────────────────────────────
FROM node:22-slim AS frontend-builder

WORKDIR /build
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm install

COPY apps/web/ ./
RUN npm run build


# ── Stage 2: Python Backend + Static Assets ─────────────────────────────
FROM python:3.13-slim AS runtime

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY apps/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY apps/api/ ./apps/api/

# Copy built frontend static files from Stage 1
COPY --from=frontend-builder /build/dist ./static

# Set Python path so 'apps.api' imports resolve
ENV PYTHONPATH=/app
ENV PORT=8080
ENV ENVIRONMENT=production
ENV DEBUG=false

# Cloud Run requires the service to listen on $PORT
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/')" || exit 1

# Start FastAPI with uvicorn
CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
