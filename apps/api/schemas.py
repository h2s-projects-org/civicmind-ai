"""
CivicMind AI — Pydantic Schemas

Request / response models for all API endpoints. Strictly typed
schemas used for request validation, serialization, and OpenAPI
documentation generation.
"""

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ═══════════════════════════════════════════════════════════════════════════
# Auth Schemas
# ═══════════════════════════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)
    role: Optional[str] = "Analyst"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=1, max_length=255)
    role: Optional[str] = "Viewer"
    department: Optional[str] = None
    organization_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: str
    department: Optional[str] = None
    organization: Optional["OrganizationResponse"] = None

    model_config = {"from_attributes": True}


class OrganizationResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    region: str

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════
# Dataset Schemas
# ═══════════════════════════════════════════════════════════════════════════

class ColumnSchema(BaseModel):
    name: str
    type: str  # "string" | "number" | "boolean" | "date"


class DatasetCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = "Custom"
    source: str = "User Upload"
    owner: str = "Civic Analyst"
    rows: list[dict[str, Any]] = Field(..., min_length=1)
    schema_definition: Optional[list[ColumnSchema]] = None


class CleaningStatsResponse(BaseModel):
    missing_values_count: int = 0
    duplicates_removed: int = 0
    outliers_detected: int = 0
    normalized_dates: int = 0
    before_rows: int = 0
    after_rows: int = 0


class DatasetResponse(BaseModel):
    id: str
    name: str
    type: str
    source: str
    owner: str
    upload_time: str
    rows: list[dict[str, Any]]
    schema: list[ColumnSchema]
    quality_score: int
    is_cleaned: bool
    cleaning_stats: Optional[CleaningStatsResponse] = None

    model_config = {"from_attributes": True}


class DatasetCleanResponse(BaseModel):
    dataset: DatasetResponse
    report: CleaningStatsResponse


# ═══════════════════════════════════════════════════════════════════════════
# Analytics Schemas
# ═══════════════════════════════════════════════════════════════════════════

class QueryRequest(BaseModel):
    group_by_col: str = Field(..., alias="groupByCol")
    aggregate_col: str = Field(..., alias="aggregateCol")
    operation: str = "avg"

    model_config = {"populate_by_name": True}


class AggregationResultItem(BaseModel):
    group: str
    value: float


class BenchmarkResponse(BaseModel):
    processing_time_ms: float = Field(..., alias="processingTimeMs")
    memory_usage_kb: float = Field(..., alias="memoryUsageKb")
    rows_processed: int = Field(..., alias="rowsProcessed")
    gpu_accelerated: bool = Field(..., alias="gpuAccelerated")
    acceleration_factor: float = Field(..., alias="accelerationFactor")
    gpu_savings_time_ms: float = Field(..., alias="gpuSavingsTimeMs")
    results: list[AggregationResultItem]

    model_config = {"populate_by_name": True}


# ═══════════════════════════════════════════════════════════════════════════
# Forecasting Schemas
# ═══════════════════════════════════════════════════════════════════════════

class ForecastRequest(BaseModel):
    metric_col: str = Field(..., alias="metricCol")
    label_col: str = Field(..., alias="labelCol")
    periods: int = 6

    model_config = {"populate_by_name": True}


class ForecastPointResponse(BaseModel):
    period: str
    historical_value: Optional[float] = Field(None, alias="historicalValue")
    forecast_value: Optional[float] = Field(None, alias="forecastValue")
    upper_bound: Optional[float] = Field(None, alias="upperBound")
    lower_bound: Optional[float] = Field(None, alias="lowerBound")

    model_config = {"populate_by_name": True}


class ForecastingResponse(BaseModel):
    metric_name: str = Field(..., alias="metricName")
    explanation: str
    growth_rate_pct: float = Field(..., alias="growthRatePct")
    seasonality_type: str = Field(..., alias="seasonalityType")
    peak_period: str = Field(..., alias="peakPeriod")
    anomaly_detected: bool = Field(..., alias="anomalyDetected")
    forecast: list[ForecastPointResponse]

    model_config = {"populate_by_name": True}


# ═══════════════════════════════════════════════════════════════════════════
# Risk Schemas
# ═══════════════════════════════════════════════════════════════════════════

class RiskCategoryResponse(BaseModel):
    name: str
    score: int
    level: str
    explanation: str
    contributing_factors: list[str] = Field(..., alias="contributingFactors")

    model_config = {"populate_by_name": True}


class RiskReportResponse(BaseModel):
    overall_score: int = Field(..., alias="overallScore")
    overall_level: str = Field(..., alias="overallLevel")
    categories: list[RiskCategoryResponse]

    model_config = {"populate_by_name": True}


# ═══════════════════════════════════════════════════════════════════════════
# Recommendation Schemas
# ═══════════════════════════════════════════════════════════════════════════

class RecommendationResponse(BaseModel):
    id: str
    dataset_id: str = Field(..., alias="datasetId")
    title: str
    description: str
    category: str
    confidence: int
    priority: str
    impact: str
    benefit: str
    status: str
    assigned_to: Optional[str] = Field(None, alias="assignedTo")

    model_config = {"populate_by_name": True}


class RecommendationUpdateRequest(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = Field(None, alias="assignedTo")

    model_config = {"populate_by_name": True}


# ═══════════════════════════════════════════════════════════════════════════
# Alert Schemas
# ═══════════════════════════════════════════════════════════════════════════

class AlertCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    dataset_id: str = Field(..., alias="datasetId")
    column: str
    operator: str  # "gt" | "lt" | "eq"
    value: float

    model_config = {"populate_by_name": True}


class AlertResponse(BaseModel):
    id: str
    name: str
    dataset_id: str = Field(..., alias="datasetId")
    column: str
    operator: str
    value: float
    status: str
    triggered_count: int = Field(..., alias="triggeredCount")

    model_config = {"populate_by_name": True}


class AlertUpdateRequest(BaseModel):
    status: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# Notification Schemas
# ═══════════════════════════════════════════════════════════════════════════

class NotificationResponse(BaseModel):
    id: str
    timestamp: str
    title: str
    message: str
    type: str
    read: bool


# ═══════════════════════════════════════════════════════════════════════════
# Audit Log Schemas
# ═══════════════════════════════════════════════════════════════════════════

class AuditLogResponse(BaseModel):
    id: str
    timestamp: str
    user: str
    action: str
    details: str


# ═══════════════════════════════════════════════════════════════════════════
# Chat / Conversational AI Schemas
# ═══════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    sender: str  # "user" | "bot"
    text: str


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)
    current_dataset_id: Optional[str] = Field(None, alias="currentDatasetId")
    chat_history: list[ChatMessage] = Field(default_factory=list, alias="chatHistory")

    model_config = {"populate_by_name": True}


class ChatResponse(BaseModel):
    text: str
    timestamp: str
    is_simulated: Optional[bool] = Field(None, alias="isSimulated")

    model_config = {"populate_by_name": True}


# ═══════════════════════════════════════════════════════════════════════════
# AI Analysis Schemas
# ═══════════════════════════════════════════════════════════════════════════

class AIKeyMetric(BaseModel):
    name: str
    value: str
    change: str


class AIAnomaly(BaseModel):
    title: str
    description: str
    severity: str


class AIAnalysisResponse(BaseModel):
    executive_summary: str = Field(..., alias="executiveSummary")
    key_metrics: list[AIKeyMetric] = Field(..., alias="keyMetrics")
    anomalies: list[AIAnomaly]
    recommended_action_summary: str = Field(..., alias="recommendedActionSummary")
    is_simulated: Optional[bool] = Field(None, alias="isSimulated")

    model_config = {"populate_by_name": True}


# ═══════════════════════════════════════════════════════════════════════════
# System Health Schemas
# ═══════════════════════════════════════════════════════════════════════════

class SystemHealthResponse(BaseModel):
    status: str = "operational"
    gpu_available: bool = False
    gpu_type: Optional[str] = None
    cudf_enabled: bool = False
    postgres_connected: bool = False
    bigquery_connected: bool = False
    uptime_seconds: float = 0.0
