"""
CivicMind AI — ORM Models

PostgreSQL table schemas for users, organizations, datasets, audit logs,
threshold alerts, recommendations, and notification workflows.
Uses SQLAlchemy 2.x declarative mapping style.
"""

import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from apps.api.infrastructure.database import Base


# ─── Enums ──────────────────────────────────────────────────────────────────

class UserRole(str, PyEnum):
    SUPER_ADMIN = "Super Admin"
    ORG_ADMIN = "Organization Admin"
    ANALYST = "Analyst"
    DECISION_MAKER = "Decision Maker"
    VIEWER = "Viewer"


class RecommendationStatus(str, PyEnum):
    PENDING = "Pending"
    APPROVED = "Approved"
    IN_PROGRESS = "In_Progress"
    COMPLETED = "Completed"
    DISMISSED = "Dismissed"


class RecommendationCategory(str, PyEnum):
    OPERATIONAL = "Operational"
    ENVIRONMENTAL = "Environmental"
    INFRASTRUCTURE = "Infrastructure"
    PUBLIC_SAFETY = "Public Safety"
    RESOURCE = "Resource"


class RecommendationPriority(str, PyEnum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class AlertStatus(str, PyEnum):
    ACTIVE = "Active"
    MUTED = "Muted"


class AlertOperator(str, PyEnum):
    GT = "gt"
    LT = "lt"
    EQ = "eq"


class NotificationType(str, PyEnum):
    AI_RECOMMENDATION = "AI_Recommendation"
    THRESHOLD_ALERT = "Threshold_Alert"
    SYSTEM = "System"


# ─── Organization ───────────────────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False, default="Municipality")
    region: Mapped[str] = mapped_column(String(255), nullable=False, default="Default Region")
    departments: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="organization", lazy="selectin")


# ─── User ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role_enum", create_constraint=True),
        nullable=False,
        default=UserRole.VIEWER,
    )
    department: Mapped[Optional[str]] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Foreign keys
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True
    )

    # Relationships
    organization: Mapped[Optional["Organization"]] = relationship(
        back_populates="users", lazy="selectin"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# ─── Dataset Metadata ──────────────────────────────────────────────────────

class DatasetMeta(Base):
    """Stores metadata about ingested datasets.

    Actual row data is stored in BigQuery tables or GCS;
    this table tracks dataset provenance and quality scores.
    """
    __tablename__ = "dataset_metadata"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False, default="Custom")
    source: Mapped[str] = mapped_column(String(255), nullable=False, default="User Upload")
    owner: Mapped[str] = mapped_column(String(255), nullable=False, default="Civic Analyst")
    upload_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    schema_definition: Mapped[Optional[dict]] = mapped_column(JSONB, default=list)
    quality_score: Mapped[int] = mapped_column(Integer, default=0)
    is_cleaned: Mapped[bool] = mapped_column(Boolean, default=False)
    cleaning_stats: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    row_count: Mapped[int] = mapped_column(Integer, default=0)

    # BigQuery reference
    bq_table_id: Mapped[Optional[str]] = mapped_column(String(512))
    gcs_uri: Mapped[Optional[str]] = mapped_column(String(1024))

    # Organization scope
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# ─── Recommendation ────────────────────────────────────────────────────────

class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("dataset_metadata.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[RecommendationCategory] = mapped_column(
        Enum(RecommendationCategory, name="rec_category_enum"),
        nullable=False,
        default=RecommendationCategory.OPERATIONAL,
    )
    confidence: Mapped[int] = mapped_column(Integer, default=0)
    priority: Mapped[RecommendationPriority] = mapped_column(
        Enum(RecommendationPriority, name="rec_priority_enum"),
        nullable=False,
        default=RecommendationPriority.MEDIUM,
    )
    impact: Mapped[str] = mapped_column(Text, default="")
    benefit: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[RecommendationStatus] = mapped_column(
        Enum(RecommendationStatus, name="rec_status_enum"),
        nullable=False,
        default=RecommendationStatus.PENDING,
    )
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# ─── Threshold Alert ───────────────────────────────────────────────────────

class ThresholdAlert(Base):
    __tablename__ = "threshold_alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("dataset_metadata.id"), nullable=False
    )
    column: Mapped[str] = mapped_column(String(255), nullable=False)
    operator: Mapped[AlertOperator] = mapped_column(
        Enum(AlertOperator, name="alert_operator_enum"), nullable=False
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus, name="alert_status_enum"),
        nullable=False,
        default=AlertStatus.ACTIVE,
    )
    triggered_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# ─── Audit Log ──────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    user: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[str] = mapped_column(Text, default="")


# ─── Notification ───────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    message: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type_enum"),
        nullable=False,
        default=NotificationType.SYSTEM,
    )
    read: Mapped[bool] = mapped_column(Boolean, default=False)

    # Optional association to a user
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
