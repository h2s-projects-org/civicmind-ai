# Implementation Plan: CivicMind AI Production-Readiness Refactoring

This implementation plan outlines the steps required to transition CivicMind AI from its current mock proof-of-concept (PoC) state to a production-ready, cloud-native enterprise application matching the original specification.

---

## User Review Required

> [!IMPORTANT]
> **Major Tech Stack Transition:** This plan replaces the current Node.js/TypeScript Express backend with a Python/FastAPI backend. Any existing local mock files will be deleted or migrated.
> 
> **Cloud Dependencies Required:** Real integration with Google Cloud BigQuery, Google Cloud Storage, and Google Cloud Secret Manager is introduced. Valid GCP credentials and service accounts must be configured.
> 
> **Database Transition:** Local JSON file-based database states are migrated to horizontal Postgres and BigQuery tables, which requires running local containerized services (Postgres and Redis) during development.

---

## Open Questions

> [!WARNING]
> 1. **GCP Project Setup:** Do you have an active GCP Project with Google BigQuery, Vertex AI APIs, and Google Cloud Storage buckets enabled? We need project IDs and bucket names.
> 2. **NVIDIA GPU Execution Environment:** Will the production deployment run on GCP Compute Engine/GKE with NVIDIA L4 GPU attachments, or should we assume Cloud Run (CPU-only) with programmatic Pandas fallback as the default?
> 3. **Identity Provider:** For Google Login authentication, do we integrate with Google Workspace OAuth/Firebase Auth, or build custom OAuth clients inside FastAPI?

---

## Proposed Changes

### Monorepo Re-organization
Align the folder structure with the monorepo specification.

#### [NEW] [apps/web](file:///Users/jenisten/Downloads/civicmind-ai/apps/web)
Move the React Vite application and its configurations into the workspace web app package.
#### [NEW] [apps/api](file:///Users/jenisten/Downloads/civicmind-ai/apps/api)
Create the new Python backend workspace package.
#### [DELETE] [server.ts](file:///Users/jenisten/Downloads/civicmind-ai/server.ts)
#### [DELETE] [server](file:///Users/jenisten/Downloads/civicmind-ai/server)

---

### Backend Framework Transition (Python/FastAPI)
Create a clean architecture Python FastAPI backend.

#### [NEW] [main.py](file:///Users/jenisten/Downloads/civicmind-ai/apps/api/main.py)
Initialize FastAPI application, set CORS configuration, configure dynamic middleware, and register router paths.
#### [NEW] [auth.py](file:///Users/jenisten/Downloads/civicmind-ai/apps/api/routers/auth.py)
Implement secure JWT and bcrypt password hashing with OAuth2 password bearer schemes for RBAC (Super Admin, Analyst, etc.).
#### [NEW] [datasets.py](file:///Users/jenisten/Downloads/civicmind-ai/apps/api/routers/datasets.py)
Ingestion endpoints storing file payloads to Google Cloud Storage and creating target metadata tables in BigQuery.
#### [NEW] [cleaning.py](file:///Users/jenisten/Downloads/civicmind-ai/apps/api/services/cleaning.py)
Data cleaning service integrating column inferences, missing value statistics, date normalizations, and stats reporting.
#### [NEW] [analytics.py](file:///Users/jenisten/Downloads/civicmind-ai/apps/api/services/analytics.py)
Query compiler using `cudf.pandas` acceleration with conditional fallback to standard `pandas` when cuDF/GPUs are unprovisioned.
#### [NEW] [ai.py](file:///Users/jenisten/Downloads/civicmind-ai/apps/api/services/ai.py)
Gemini Vertex AI orchestration using strict Pydantic models for structured output parsing, safety parameters check, and vector similarity retrieval (RAG).

---

### Database & Ingestion Infrastructure
Introduce Postgres and Google BigQuery connections.

#### [NEW] [database.py](file:///Users/jenisten/Downloads/civicmind-ai/apps/api/infrastructure/database.py)
Configure SQLAlchemy connection pooling for Postgres (transactional logs, alerts, recommendations) and setup BigQuery connection client.
#### [NEW] [models.py](file:///Users/jenisten/Downloads/civicmind-ai/apps/api/infrastructure/models.py)
Postgres ORM schemas for users, audit logs, active threshold alerts, and recommendation workflows.

---

### Frontend API Layer Realignment
Update frontend queries to map to the new FastAPI endpoints.

#### [MODIFY] [App.tsx](file:///Users/jenisten/Downloads/civicmind-ai/apps/web/src/App.tsx)
Point all `/api/*` endpoints to the FastAPI application gateway. Introduce authorization headers carrying JWT bearer tokens.
#### [MODIFY] [Navbar.tsx](file:///Users/jenisten/Downloads/civicmind-ai/apps/web/src/components/Navbar.tsx)
Replace hardcoded cuDF enabled metrics with live backend system health checks returning GPU/CPU usage.

---

## Verification Plan

### Automated Tests
- Run backend unit tests using `pytest` for routers and database modules:
  ```bash
  cd apps/api && pytest
  ```
- Run frontend typechecks and build:
  ```bash
  cd apps/web && npm run lint && npm run build
  ```

### Manual Verification
1. **Mock Login Test:** Attempt to log in with invalid credentials to verify JWT auth verification.
2. **File Ingestion Test:** Ingest a custom CSV, verify that the cleaning engine outputs correct stats, and check that the schema matches the BigQuery table creation.
3. **GPU Fallback Check:** Run analytics aggregations on a CPU instance and check that the speedup metrics gracefully falls back without throwing exceptions.
