import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime,
    ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship

from app.db.session import Base

class IssueCategory(str, enum.Enum):
    POTHOLE = "POTHOLE"
    ROAD_CRACK = "ROAD_CRACK"
    GARBAGE = "GARBAGE"
    WATER_LEAK = "WATER_LEAK"
    STREETLIGHT = "STREETLIGHT"
    WATERLOGGING = "WATERLOGGING"
    FALLEN_TREE = "FALLEN_TREE"
    DAMAGED_INFRASTRUCTURE = "DAMAGED_INFRASTRUCTURE"
    OTHER = "OTHER"

class IssueSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class IssueStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    VERIFIED = "VERIFIED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REOPENED = "REOPENED"
    REJECTED = "REJECTED"

class Issue(Base):
    __tablename__ = "issues"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String(30), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(Enum(IssueCategory), nullable=False, index=True)
    severity = Column(Enum(IssueSeverity), default=IssueSeverity.MEDIUM, nullable=False, index=True)
    status = Column(Enum(IssueStatus), default=IssueStatus.SUBMITTED, nullable=False, index=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_geom = Column(String(100), nullable=True)
    
    address_text = Column(String(255), nullable=True)
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="SET NULL"), nullable=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    
    canonical_issue_id = Column(String(36), ForeignKey("issues.id", ondelete="SET NULL"), nullable=True, index=True)
    
    priority_score = Column(Float, default=0.0, nullable=False, index=True)
    priority_breakdown = Column(JSON, nullable=True)
    
    resolution_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    reporter = relationship("User", back_populates="reported_issues", foreign_keys=[reporter_id])
    ward = relationship("Ward", back_populates="issues")
    photos = relationship("IssuePhoto", back_populates="issue", cascade="all, delete-orphan")
    assignments = relationship("IssueAssignment", back_populates="issue", cascade="all, delete-orphan", order_by="desc(IssueAssignment.assigned_at)")
    updates = relationship("IssueUpdate", back_populates="issue", cascade="all, delete-orphan", order_by="desc(IssueUpdate.created_at)")
    comments = relationship("IssueComment", back_populates="issue", cascade="all, delete-orphan", order_by="asc(IssueComment.created_at)")
    canonical_issue = relationship("Issue", remote_side=[id], foreign_keys=[canonical_issue_id])

class IssuePhoto(Base):
    __tablename__ = "issue_photos"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    photo_url = Column(String(500), nullable=False)
    photo_type = Column(String(50), default="REPORT", nullable=False)  # REPORT, RESOLUTION_EVIDENCE
    caption = Column(String(255), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    issue = relationship("Issue", back_populates="photos")
    uploader = relationship("User")

class IssueAssignment(Base):
    __tablename__ = "issue_assignments"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    notes = Column(Text, nullable=True)
    is_current = Column(Boolean, default=True, nullable=False, index=True)
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    issue = relationship("Issue", back_populates="assignments")
    department = relationship("Department", back_populates="assignments")
    team = relationship("Team", back_populates="assignments")
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id], back_populates="assigned_issues")
    assigned_by = relationship("User", foreign_keys=[assigned_by_user_id])

class IssueUpdate(Base):
    __tablename__ = "issue_updates"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    from_status = Column(Enum(IssueStatus), nullable=True)
    to_status = Column(Enum(IssueStatus), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    issue = relationship("Issue", back_populates="updates")
    actor = relationship("User")

class IssueComment(Base):
    __tablename__ = "issue_comments"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comment_text = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)  # Officer internal comment
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    issue = relationship("Issue", back_populates="comments")
    author = relationship("User")

class IssueDuplicate(Base):
    __tablename__ = "issue_duplicates"

    id = Column(Integer, primary_key=True, index=True)
    canonical_issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    duplicate_issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    confidence_score = Column(Float, nullable=False)
    status = Column(String(50), default="CANDIDATE", nullable=False)  # CANDIDATE, CONFIRMED, REJECTED
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    canonical = relationship("Issue", foreign_keys=[canonical_issue_id])
    duplicate = relationship("Issue", foreign_keys=[duplicate_issue_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class SavedRoute(Base):
    __tablename__ = "saved_routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    waypoints_geojson = Column(JSON, nullable=False)
    total_distance_km = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    creator = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(String(50), nullable=False)
    details_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    actor = relationship("User")
