from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from app.models.issue import IssueCategory, IssueSeverity, IssueStatus

class IssuePhotoOut(BaseModel):
    id: int
    photo_url: str
    photo_type: str
    caption: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class IssueUpdateOut(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    from_status: Optional[IssueStatus] = None
    to_status: IssueStatus
    note: Optional[str] = None
    created_at: datetime

class IssueCommentCreate(BaseModel):
    comment_text: str = Field(..., min_length=1)
    is_internal: bool = False

class IssueCommentOut(BaseModel):
    id: int
    author_id: int
    author_name: str
    author_role: str
    comment_text: str
    is_internal: bool
    created_at: datetime

class IssueAssignmentOut(BaseModel):
    id: int
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    assigned_by_name: Optional[str] = None
    notes: Optional[str] = None
    is_current: bool
    assigned_at: datetime

class IssueAssignCreate(BaseModel):
    department_id: Optional[int] = None
    team_id: Optional[int] = None
    assigned_to_user_id: Optional[int] = None
    notes: Optional[str] = None

class IssueCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    category: IssueCategory
    severity: IssueSeverity = IssueSeverity.MEDIUM
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address_text: Optional[str] = None
    ward_id: Optional[int] = None
    is_anonymous: bool = False

class IssueStatusChange(BaseModel):
    status: IssueStatus
    note: Optional[str] = None
    resolution_notes: Optional[str] = None

class MapIssueOut(BaseModel):
    id: str
    ticket_id: str
    title: str
    category: IssueCategory
    severity: IssueSeverity
    status: IssueStatus
    latitude: float
    longitude: float
    priority_score: float
    priority_band: str
    address_text: Optional[str] = None
    ward_name: Optional[str] = None
    created_at: datetime

class IssueDetailOut(BaseModel):
    id: str
    ticket_id: str
    title: str
    description: str
    category: IssueCategory
    severity: IssueSeverity
    status: IssueStatus
    latitude: float
    longitude: float
    address_text: Optional[str] = None
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    reporter_id: int
    reporter_name: Optional[str] = None
    is_anonymous: bool
    canonical_issue_id: Optional[str] = None
    priority_score: float
    priority_breakdown: Optional[Dict[str, Any]] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    verified_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    photos: List[IssuePhotoOut] = []
    assignments: List[IssueAssignmentOut] = []
    updates: List[IssueUpdateOut] = []
    comments: List[IssueCommentOut] = []
    duplicate_candidates: List[Dict[str, Any]] = []

class IssueListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[IssueDetailOut]
