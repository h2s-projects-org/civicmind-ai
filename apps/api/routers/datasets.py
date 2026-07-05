"""
CivicMind AI — Dataset & Operations Router

Handles all dataset lifecycle operations: CRUD, cleaning, accelerated
analytics queries, forecasting, risk scoring, AI analysis,
recommendation generation, threshold alerts, notifications, chat,
and audit logs.

Uses an in-memory store (development) with GCS/BigQuery-ready hooks.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status

from apps.api.services.cleaning import clean_dataset
from apps.api.services.analytics import (
    benchmark_query,
    is_gpu_available,
    run_bigquery_aggregation,
    upload_dataset_to_bigquery,
    upload_dataset_to_gcs,
)
from apps.api.services.forecasting import generate_forecast
from apps.api.services.risk import calculate_risk_scores
from apps.api.services import ai as ai_service

router = APIRouter(prefix="/api", tags=["Datasets & Operations"])


# ═══════════════════════════════════════════════════════════════════════════
# In-Memory Data Store (Development Mode)
# ═══════════════════════════════════════════════════════════════════════════
# In production, these are backed by PostgreSQL + BigQuery.

_datasets: list[dict[str, Any]] = []
_recommendations: list[dict[str, Any]] = []
_alerts: list[dict[str, Any]] = []
_notifications: list[dict[str, Any]] = []
_audit_logs: list[dict[str, Any]] = []


def _log_action(user: str, action: str, details: str):
    """Append an audit log entry."""
    _audit_logs.insert(0, {
        "id": f"log_{uuid.uuid4().hex[:9]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user": user,
        "action": action,
        "details": details,
    })


def _seed_default_data():
    """Seed initial community operational datasets for demonstration."""
    if _datasets:
        return  # Already seeded

    # 1. Public Safety & Emergency Calls
    safety_rows = [
        {"id": 1, "district": "District A (Downtown)", "type": "Medical Emergency", "response_time": 8.5, "officers_deployed": 2, "severity": "High", "time": "2026-07-01T08:30:00Z"},
        {"id": 2, "district": "District B (Northside)", "type": "Traffic Accident", "response_time": 14.2, "officers_deployed": 3, "severity": "Medium", "time": "2026-07-01T11:15:00Z"},
        {"id": 3, "district": "District A (Downtown)", "type": "Theft Report", "response_time": 25.0, "officers_deployed": 1, "severity": "Low", "time": "2026-07-01T14:45:00Z"},
        {"id": 4, "district": "District C (East River)", "type": "Fire Incident", "response_time": 6.1, "officers_deployed": 6, "severity": "Critical", "time": "2026-07-02T02:10:00Z"},
        {"id": 5, "district": "District B (Northside)", "type": "Medical Emergency", "response_time": 11.8, "officers_deployed": 2, "severity": "High", "time": "2026-07-02T09:00:00Z"},
        {"id": 6, "district": "District D (South Hills)", "type": "Disturbance", "response_time": 18.3, "officers_deployed": 1, "severity": "Low", "time": "2026-07-02T19:30:00Z"},
        {"id": 7, "district": "District A (Downtown)", "type": "Fire Incident", "response_time": 5.4, "officers_deployed": 8, "severity": "Critical", "time": "2026-07-03T01:20:00Z"},
        {"id": 8, "district": "District C (East River)", "type": "Traffic Accident", "response_time": 12.0, "officers_deployed": 2, "severity": "Medium", "time": "2026-07-03T10:45:00Z"},
        {"id": 9, "district": "District D (South Hills)", "type": "Medical Emergency", "response_time": 15.6, "officers_deployed": 2, "severity": "High", "time": "2026-07-03T16:15:00Z"},
        {"id": 10, "district": "District B (Northside)", "type": "Theft Report", "response_time": 28.1, "officers_deployed": 1, "severity": "Low", "time": "2026-07-04T05:00:00Z"},
    ]

    _datasets.append({
        "id": "dataset_safety_01",
        "name": "Public Safety & Emergency Response Logs",
        "type": "Safety",
        "source": "Municipal Dispatch (CAD)",
        "owner": "Department of Public Safety",
        "uploadTime": (datetime.now(timezone.utc) - __import__("datetime").timedelta(hours=4)).isoformat(),
        "rows": safety_rows,
        "schema": [
            {"name": "id", "type": "number"}, {"name": "district", "type": "string"},
            {"name": "type", "type": "string"}, {"name": "response_time", "type": "number"},
            {"name": "officers_deployed", "type": "number"}, {"name": "severity", "type": "string"},
            {"name": "time", "type": "date"},
        ],
        "qualityScore": 92, "isCleaned": True,
        "cleaningStats": {
            "missingValuesCount": 2, "duplicatesRemoved": 0,
            "outliersDetected": 1, "normalizedDates": 10,
            "beforeRows": 10, "afterRows": 10,
        },
    })

    # 2. Environmental & Air Quality
    env_rows = [
        {"id": 1, "location": "District A (Downtown)", "aqi": 82, "carbon_ppm": 420, "temperature_c": 26.5, "humidity_pct": 54, "waste_bin_fill_rate": 85},
        {"id": 2, "location": "District B (Northside)", "aqi": 48, "carbon_ppm": 385, "temperature_c": 24.2, "humidity_pct": 60, "waste_bin_fill_rate": 42},
        {"id": 3, "location": "District C (East River)", "aqi": 112, "carbon_ppm": 465, "temperature_c": 28.0, "humidity_pct": 48, "waste_bin_fill_rate": 94},
        {"id": 4, "location": "District D (South Hills)", "aqi": 35, "carbon_ppm": 360, "temperature_c": 22.8, "humidity_pct": 68, "waste_bin_fill_rate": 30},
        {"id": 5, "location": "District A (Downtown)", "aqi": 88, "carbon_ppm": 428, "temperature_c": 27.2, "humidity_pct": 52, "waste_bin_fill_rate": 90},
        {"id": 6, "location": "District B (Northside)", "aqi": 52, "carbon_ppm": 390, "temperature_c": 24.8, "humidity_pct": 58, "waste_bin_fill_rate": 55},
        {"id": 7, "location": "District C (East River)", "aqi": 125, "carbon_ppm": 480, "temperature_c": 29.1, "humidity_pct": 45, "waste_bin_fill_rate": 98},
        {"id": 8, "location": "District D (South Hills)", "aqi": 38, "carbon_ppm": 365, "temperature_c": 23.0, "humidity_pct": 65, "waste_bin_fill_rate": 35},
    ]

    _datasets.append({
        "id": "dataset_env_01",
        "name": "Smart City Environmental Sensors & Waste Levels",
        "type": "Environmental",
        "source": "IoT Sensor Mesh",
        "owner": "Bureau of Sanitation & Environment",
        "uploadTime": (datetime.now(timezone.utc) - __import__("datetime").timedelta(hours=3)).isoformat(),
        "rows": env_rows,
        "schema": [
            {"name": "id", "type": "number"}, {"name": "location", "type": "string"},
            {"name": "aqi", "type": "number"}, {"name": "carbon_ppm", "type": "number"},
            {"name": "temperature_c", "type": "number"}, {"name": "humidity_pct", "type": "number"},
            {"name": "waste_bin_fill_rate", "type": "number"},
        ],
        "qualityScore": 96, "isCleaned": True,
        "cleaningStats": {
            "missingValuesCount": 0, "duplicatesRemoved": 0,
            "outliersDetected": 0, "normalizedDates": 0,
            "beforeRows": 8, "afterRows": 8,
        },
    })

    # 3. Transportation & Traffic
    trans_rows = [
        {"id": 1, "intersection": "Downtown Main St & 5th Ave", "vehicle_count": 1420, "average_delay_sec": 45.2, "public_transit_delay_min": 8, "peak_congestion_level": "High"},
        {"id": 2, "intersection": "Northside Hwy 101 Outlet", "vehicle_count": 2200, "average_delay_sec": 75.8, "public_transit_delay_min": 14, "peak_congestion_level": "Critical"},
        {"id": 3, "intersection": "East River Bridge Crossing", "vehicle_count": 1850, "average_delay_sec": 55.0, "public_transit_delay_min": 5, "peak_congestion_level": "High"},
        {"id": 4, "intersection": "South Hills Residential Pkwy", "vehicle_count": 650, "average_delay_sec": 12.4, "public_transit_delay_min": 2, "peak_congestion_level": "Low"},
        {"id": 5, "intersection": "Downtown Main St & 5th Ave", "vehicle_count": 1380, "average_delay_sec": 41.5, "public_transit_delay_min": 6, "peak_congestion_level": "High"},
        {"id": 6, "intersection": "Northside Hwy 101 Outlet", "vehicle_count": 2150, "average_delay_sec": 71.2, "public_transit_delay_min": 12, "peak_congestion_level": "Critical"},
        {"id": 7, "intersection": "East River Bridge Crossing", "vehicle_count": 1900, "average_delay_sec": 62.4, "public_transit_delay_min": 8, "peak_congestion_level": "High"},
    ]

    _datasets.append({
        "id": "dataset_trans_01",
        "name": "Automated Traffic Counter (ATC) Traffic Volumes",
        "type": "Transportation",
        "source": "SCATS Signal System",
        "owner": "Department of Transportation",
        "uploadTime": (datetime.now(timezone.utc) - __import__("datetime").timedelta(hours=2)).isoformat(),
        "rows": trans_rows,
        "schema": [
            {"name": "id", "type": "number"}, {"name": "intersection", "type": "string"},
            {"name": "vehicle_count", "type": "number"}, {"name": "average_delay_sec", "type": "number"},
            {"name": "public_transit_delay_min", "type": "number"}, {"name": "peak_congestion_level", "type": "string"},
        ],
        "qualityScore": 89, "isCleaned": True,
        "cleaningStats": {
            "missingValuesCount": 3, "duplicatesRemoved": 1,
            "outliersDetected": 2, "normalizedDates": 0,
            "beforeRows": 8, "afterRows": 7,
        },
    })

    # Seed recommendations
    _recommendations.extend([
        {
            "id": "rec_01", "datasetId": "dataset_env_01",
            "title": "Deploy Urgent Sanitation Dispatch to District C",
            "description": "Waste bin fill rates exceeding 98% in District C pose a high environmental risk.",
            "category": "Environmental", "confidence": 96, "priority": "High",
            "impact": "Reduces environmental risk score and community complaints.",
            "benefit": "Lowers regional environmental risk by 15%.",
            "status": "Pending",
        },
        {
            "id": "rec_02", "datasetId": "dataset_safety_01",
            "title": "Relocate Fire Rescue Vehicle to District A Substation",
            "description": "District A reports high response times and highest density of high-severity emergency fire logs.",
            "category": "Public Safety", "confidence": 92, "priority": "High",
            "impact": "Accelerates response times by up to 35% in District A.",
            "benefit": "Prevents critical escalation of commercial incidents.",
            "status": "In_Progress", "assignedTo": "Chief Commander",
        },
        {
            "id": "rec_03", "datasetId": "dataset_trans_01",
            "title": "Signal Timing Optimization on Northside Hwy 101",
            "description": "Peak hour analysis shows critical signal bottlenecks exceeding 75 seconds per vehicle.",
            "category": "Infrastructure", "confidence": 85, "priority": "Medium",
            "impact": "Improves vehicle transit throughput.",
            "benefit": "Saves estimated 2,400 daily vehicle hours.",
            "status": "Approved",
        },
    ])

    # Seed alerts
    _alerts.extend([
        {
            "id": "alert_01", "name": "District C Solid Waste Overflow Alert",
            "datasetId": "dataset_env_01", "column": "waste_bin_fill_rate",
            "operator": "gt", "value": 90, "status": "Active", "triggeredCount": 4,
        },
        {
            "id": "alert_02", "name": "Critical Traffic Bottleneck Delay Alert",
            "datasetId": "dataset_trans_01", "column": "average_delay_sec",
            "operator": "gt", "value": 70, "status": "Active", "triggeredCount": 2,
        },
    ])

    # Seed notifications
    _notifications.extend([
        {
            "id": "notif_01", "timestamp": datetime.now(timezone.utc).isoformat(),
            "title": "New AI Recommendation Generated",
            "message": "CivicMind AI generated 2 high-priority recommendations for District C waste and District A emergency fire substation.",
            "type": "AI_Recommendation", "read": False,
        },
        {
            "id": "notif_02", "timestamp": (datetime.now(timezone.utc) - __import__("datetime").timedelta(minutes=30)).isoformat(),
            "title": "Solid Waste Level Exceeded Threshold",
            "message": "Waste bin fill rate in District C reached 98%, triggering the overflow alert.",
            "type": "Threshold_Alert", "read": False,
        },
    ])

    _log_action("System", "Database Initialization", "Seeded default community operational datasets.")


# Seed on module load
_seed_default_data()


# ═══════════════════════════════════════════════════════════════════════════
# Dataset CRUD
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/datasets")
async def list_datasets():
    """Return all ingested datasets."""
    return _datasets


@router.post("/datasets", status_code=status.HTTP_201_CREATED)
async def create_dataset(payload: dict[str, Any]):
    """Ingest a new dataset with automatic schema inference and quality scoring."""
    name = payload.get("name")
    rows = payload.get("rows", [])

    if not name or not rows or not isinstance(rows, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields or rows array is empty",
        )

    dataset_id = f"dataset_{uuid.uuid4().hex[:9]}"

    # Auto-infer schema
    schema = payload.get("schema") or _infer_schema(rows[0])

    # Calculate data quality score
    null_count = sum(
        1 for row in rows for field in schema
        if row.get(field["name"]) in (None, "")
    )
    total_cells = len(rows) * len(schema)
    null_rate = null_count / total_cells if total_cells > 0 else 0
    quality_score = max(40, round((1 - null_rate) * 100))

    new_dataset = {
        "id": dataset_id,
        "name": name,
        "type": payload.get("type", "Custom"),
        "source": payload.get("source", "User Upload"),
        "owner": payload.get("owner", "Civic Analyst"),
        "uploadTime": datetime.now(timezone.utc).isoformat(),
        "rows": rows,
        "schema": schema,
        "qualityScore": quality_score,
        "isCleaned": False,
    }

    # ── Cloud Storage: persist raw dataset to GCS ───────────────────────
    gcs_uri = upload_dataset_to_gcs(dataset_id, name, rows)
    if gcs_uri:
        new_dataset["gcsUri"] = gcs_uri

    # ── BigQuery: load dataset into warehouse table ─────────────────────
    bq_table_id = upload_dataset_to_bigquery(dataset_id, name, rows)
    if bq_table_id:
        new_dataset["bqTableId"] = bq_table_id

    _datasets.append(new_dataset)
    _log_action(
        new_dataset["owner"],
        "Dataset Ingested",
        f"Uploaded dataset '{name}' with {len(rows)} rows."
        + (f" [GCS: {gcs_uri}]" if gcs_uri else "")
        + (f" [BQ: {bq_table_id}]" if bq_table_id else ""),
    )

    return new_dataset


@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Remove a dataset and its associated recommendations."""
    idx = next(
        (i for i, d in enumerate(_datasets) if d["id"] == dataset_id),
        None,
    )
    if idx is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    removed = _datasets.pop(idx)

    # Clear associated recommendations
    global _recommendations
    _recommendations = [r for r in _recommendations if r.get("datasetId") != dataset_id]

    _log_action("Analyst", "Dataset Deleted", f"Removed dataset '{removed['name']}'.")

    return {"message": "Dataset and associated alerts successfully deleted"}


# ═══════════════════════════════════════════════════════════════════════════
# Data Cleaning
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/datasets/{dataset_id}/clean")
async def clean_dataset_endpoint(dataset_id: str):
    """Run the automated data cleaning pipeline on a dataset."""
    ds = _find_dataset_or_404(dataset_id)

    report = clean_dataset(ds["rows"], ds["schema"])

    ds["rows"] = report.cleaned_rows
    ds["isCleaned"] = True
    ds["qualityScore"] = 100
    ds["cleaningStats"] = report.to_dict()

    _log_action(
        "System Cleaning Engine",
        "Dataset Standardized",
        f"Cleaned dataset '{ds['name']}'.",
    )

    return {"dataset": ds, "report": ds["cleaningStats"]}


# ═══════════════════════════════════════════════════════════════════════════
# Accelerated Analytics
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/datasets/{dataset_id}/query")
async def run_benchmark_query(dataset_id: str, payload: dict[str, Any]):
    """Execute an aggregation query with GPU benchmark comparison.

    If the dataset has been loaded into BigQuery (bqTableId is set),
    also runs the query against BigQuery and includes warehouse
    metrics in the response.
    """
    ds = _find_dataset_or_404(dataset_id)

    group_by_col = payload.get("groupByCol")
    aggregate_col = payload.get("aggregateCol")
    operation = payload.get("operation", "avg")

    if not group_by_col or not aggregate_col:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="groupByCol and aggregateCol parameters are required",
        )

    # Run local pandas/cudf benchmark
    result = benchmark_query(ds["rows"], group_by_col, aggregate_col, operation)

    # If dataset is in BigQuery, also run the warehouse query
    bq_table_id = ds.get("bqTableId")
    if bq_table_id:
        bq_result = run_bigquery_aggregation(
            bq_table_id, group_by_col, aggregate_col, operation
        )
        if bq_result:
            result["bigQueryBenchmark"] = bq_result

    return result


# ═══════════════════════════════════════════════════════════════════════════
# Predictive Forecasting
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/datasets/{dataset_id}/forecast")
async def run_forecast(dataset_id: str, payload: dict[str, Any]):
    """Generate predictive forecast for a dataset metric."""
    ds = _find_dataset_or_404(dataset_id)

    metric_col = payload.get("metricCol")
    label_col = payload.get("labelCol")
    periods = payload.get("periods", 6)

    if not metric_col or not label_col:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="metricCol and labelCol parameters are required",
        )

    historical_data = [
        {"label": str(row.get(label_col, "N/A")), "value": float(row.get(metric_col, 0) or 0)}
        for row in ds["rows"]
    ]

    result = generate_forecast(historical_data, metric_col, periods)
    return result


# ═══════════════════════════════════════════════════════════════════════════
# AI Analysis & Recommendations
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/datasets/{dataset_id}/analyze")
async def analyze_dataset(dataset_id: str):
    """Run deep Gemini AI analysis on a dataset."""
    ds = _find_dataset_or_404(dataset_id)
    report = await ai_service.analyze_dataset_with_ai(ds)
    return report


@router.post("/datasets/{dataset_id}/generate-recommendations")
async def generate_recommendations(dataset_id: str):
    """Generate AI-powered recommendations for a dataset."""
    ds = _find_dataset_or_404(dataset_id)
    new_recs = await ai_service.generate_ai_recommendations(ds)
    _recommendations.extend(new_recs)

    _notifications.insert(0, {
        "id": f"notif_{uuid.uuid4().hex[:9]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "title": "New AI Recommendations Available",
        "message": f"CivicMind AI analyzed dataset '{ds['name']}' and added {len(new_recs)} actionable intelligence workflows.",
        "type": "AI_Recommendation",
        "read": False,
    })

    _log_action(
        "Gemini Core Engine",
        "Recommendations Computed",
        f"Generated {len(new_recs)} proposals for dataset '{ds['name']}'.",
    )

    return new_recs


# ═══════════════════════════════════════════════════════════════════════════
# Risk Scores
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/risk-scores")
async def get_risk_scores():
    """Calculate and return community risk scores across all datasets."""
    report = calculate_risk_scores(_datasets)
    return report


# ═══════════════════════════════════════════════════════════════════════════
# Recommendations CRUD
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/recommendations")
async def list_recommendations():
    """Return all platform recommendations."""
    return _recommendations


@router.put("/recommendations/{rec_id}")
async def update_recommendation(rec_id: str, payload: dict[str, Any]):
    """Update a recommendation's status or assignment."""
    rec = next((r for r in _recommendations if r["id"] == rec_id), None)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if payload.get("status"):
        rec["status"] = payload["status"]
    if "assignedTo" in payload:
        rec["assignedTo"] = payload["assignedTo"]

    _log_action(
        "Decision Maker",
        "Workflow Updated",
        f"Updated recommendation '{rec['title']}' to {rec['status']}.",
    )

    return rec


# ═══════════════════════════════════════════════════════════════════════════
# Threshold Alerts
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/alerts")
async def list_alerts():
    """Return all threshold alerts."""
    return _alerts


@router.post("/alerts", status_code=status.HTTP_201_CREATED)
async def create_alert(payload: dict[str, Any]):
    """Create a new threshold alert."""
    required = ["name", "datasetId", "column", "operator", "value"]
    for field in required:
        if field not in payload or payload[field] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required parameter: {field}",
            )

    new_alert = {
        "id": f"alert_{uuid.uuid4().hex[:9]}",
        "name": payload["name"],
        "datasetId": payload["datasetId"],
        "column": payload["column"],
        "operator": payload["operator"],
        "value": float(payload["value"]),
        "status": "Active",
        "triggeredCount": 0,
    }

    _alerts.append(new_alert)
    _log_action(
        "Analyst",
        "Alert Configured",
        f"Set threshold '{new_alert['name']}' on column '{new_alert['column']}'.",
    )

    return new_alert


@router.put("/alerts/{alert_id}")
async def update_alert(alert_id: str, payload: dict[str, Any]):
    """Update an alert's status (Active/Muted)."""
    alert = next((a for a in _alerts if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if payload.get("status"):
        alert["status"] = payload["status"]

    return alert


# ═══════════════════════════════════════════════════════════════════════════
# Notifications
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/notifications")
async def list_notifications():
    """Return all system notifications."""
    return _notifications


@router.post("/notifications/read")
async def mark_notifications_read():
    """Mark all notifications as read."""
    for n in _notifications:
        n["read"] = True
    return {"message": "All notifications marked as read"}


# ═══════════════════════════════════════════════════════════════════════════
# Audit Logs
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/audit-logs")
async def list_audit_logs():
    """Return all system audit logs."""
    return _audit_logs


# ═══════════════════════════════════════════════════════════════════════════
# Conversational AI / RAG Chat
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/chat")
async def chat(payload: dict[str, Any]):
    """Send a query to the conversational AI assistant."""
    query = payload.get("query")
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query is required",
        )

    current_dataset_id = payload.get("currentDatasetId")
    chat_history = payload.get("chatHistory", [])

    current_dataset = None
    if current_dataset_id:
        current_dataset = next(
            (d for d in _datasets if d["id"] == current_dataset_id), None
        )

    # Filter recommendations and alerts for the current dataset
    filtered_recs = [
        r for r in _recommendations
        if not current_dataset_id or r.get("datasetId") == current_dataset_id
    ]
    filtered_alerts = [
        a for a in _alerts
        if not current_dataset_id or a.get("datasetId") == current_dataset_id
    ]

    response = await ai_service.answer_conversational_ai(
        query=query,
        current_dataset=current_dataset,
        all_datasets=_datasets,
        recommendations=filtered_recs,
        alerts=filtered_alerts,
        chat_history=chat_history,
    )

    return response


# ═══════════════════════════════════════════════════════════════════════════
# System Health
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/system/health")
async def system_health():
    """Return system health status including GPU, BigQuery, and GCS availability."""
    from apps.api.infrastructure.database import get_bigquery_client, get_gcs_client
    from apps.api.config import get_settings

    _settings = get_settings()
    bq_client = get_bigquery_client()
    gcs_client = get_gcs_client()

    return {
        "status": "operational",
        "gpuAvailable": is_gpu_available(),
        "gpuType": "NVIDIA L4" if is_gpu_available() else None,
        "cudfEnabled": is_gpu_available(),
        "bigqueryConnected": bq_client is not None,
        "bigqueryDataset": _settings.gcp_bigquery_dataset if bq_client else None,
        "gcsConnected": gcs_client is not None,
        "gcsBucket": _settings.gcp_storage_bucket if gcs_client else None,
        "geminiConfigured": bool(_settings.gemini_api_key),
        "datasetsLoaded": len(_datasets),
        "recommendationsActive": len(_recommendations),
        "alertsActive": len([a for a in _alerts if a.get("status") == "Active"]),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def _find_dataset_or_404(dataset_id: str) -> dict[str, Any]:
    """Find a dataset by ID or raise 404."""
    ds = next((d for d in _datasets if d["id"] == dataset_id), None)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return ds


def _infer_schema(sample_row: dict[str, Any]) -> list[dict[str, str]]:
    """Auto-infer column schema from a sample row."""
    schema = []
    for key, val in sample_row.items():
        if isinstance(val, bool):
            col_type = "boolean"
        elif isinstance(val, (int, float)):
            col_type = "number"
        elif isinstance(val, str) and len(val) > 8:
            try:
                datetime.fromisoformat(val.replace("Z", "+00:00"))
                col_type = "date"
            except (ValueError, TypeError):
                col_type = "string"
        else:
            col_type = "string"
        schema.append({"name": key, "type": col_type})
    return schema
