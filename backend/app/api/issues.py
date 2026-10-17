import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, asc
from app.db.session import get_db
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.department import Ward, Department, Team
from app.models.issue import (
    Issue, IssueCategory, IssueSeverity, IssueStatus,
    IssuePhoto, IssueAssignment, IssueUpdate, IssueComment,
    IssueDuplicate, Notification
)
from app.schemas.issue import (
    IssueCreate, IssueDetailOut, IssueListResponse,
    IssueStatusChange, MapIssueOut, IssueCommentCreate,
    IssueCommentOut, IssueAssignCreate, IssueAssignmentOut,
    IssueUpdateOut, IssuePhotoOut
)
from app.api.deps import get_current_user, get_current_active_user_optional, require_role
from app.services.priority_engine import calculate_priority_score
from app.services.duplicate_detection import find_duplicate_candidates
from app.services.workflow_service import apply_status_transition

router = APIRouter(prefix="/issues", tags=["Issues"])

def generate_ticket_id(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    count = db.query(Issue).count() + 1
    return f"TKT-{year}-{count:04d}"

def serialize_issue_detail(issue: Issue, db: Session, current_user: Optional[User] = None) -> dict:
    ward_name = issue.ward.name if issue.ward else None
    
    # Hide reporter name if anonymous and user is citizen/unauthenticated
    is_privileged = current_user and current_user.role in [UserRole.MUNICIPAL_OFFICER, UserRole.ADMIN, UserRole.FIELD_WORKER]
    if issue.is_anonymous and not is_privileged:
        reporter_name = "Anonymous Citizen"
    else:
        reporter_name = issue.reporter.full_name if issue.reporter else "Unknown"

    # Duplicates candidates
    dup_records = db.query(IssueDuplicate).filter(
        or_(
            IssueDuplicate.canonical_issue_id == issue.id,
            IssueDuplicate.duplicate_issue_id == issue.id
        )
    ).all()
    
    dup_list = []
    for d in dup_records:
        other_id = d.duplicate_issue_id if d.canonical_issue_id == issue.id else d.canonical_issue_id
        other_issue = db.query(Issue).filter(Issue.id == other_id).first()
        if other_issue:
            dup_list.append({
                "candidate_id": d.id,
                "other_issue_id": other_issue.id,
                "other_ticket_id": other_issue.ticket_id,
                "other_title": other_issue.title,
                "category": other_issue.category.value,
                "status": other_issue.status.value,
                "confidence_score": d.confidence_score,
                "relationship_status": d.status,
                "is_canonical": d.canonical_issue_id == issue.id
            })

    # Timeline updates
    updates_out = []
    for u in issue.updates:
        actor_name = u.actor.full_name if u.actor else "System"
        updates_out.append({
            "id": u.id,
            "actor_id": u.actor_id,
            "actor_name": actor_name,
            "from_status": u.from_status,
            "to_status": u.to_status,
            "note": u.note,
            "created_at": u.created_at
        })

    # Comments
    comments_out = []
    for c in issue.comments:
        if c.is_internal and not is_privileged:
            continue
        comments_out.append({
            "id": c.id,
            "author_id": c.author_id,
            "author_name": c.author.full_name if c.author else "Staff",
            "author_role": c.author.role.value if c.author else "STAFF",
            "comment_text": c.comment_text,
            "is_internal": c.is_internal,
            "created_at": c.created_at
        })

    # Assignments
    assignments_out = []
    for a in issue.assignments:
        assignments_out.append({
            "id": a.id,
            "department_id": a.department_id,
            "department_name": a.department.name if a.department else None,
            "team_id": a.team_id,
            "team_name": a.team.name if a.team else None,
            "assigned_to_user_id": a.assigned_to_user_id,
            "assigned_to_name": a.assigned_to.full_name if a.assigned_to else None,
            "assigned_by_name": a.assigned_by.full_name if a.assigned_by else "Supervisor",
            "notes": a.notes,
            "is_current": a.is_current,
            "assigned_at": a.assigned_at
        })

    return {
        "id": issue.id,
        "ticket_id": issue.ticket_id,
        "title": issue.title,
        "description": issue.description,
        "category": issue.category,
        "severity": issue.severity,
        "status": issue.status,
        "latitude": issue.latitude,
        "longitude": issue.longitude,
        "address_text": issue.address_text,
        "ward_id": issue.ward_id,
        "ward_name": ward_name,
        "reporter_id": issue.reporter_id,
        "reporter_name": reporter_name,
        "is_anonymous": issue.is_anonymous,
        "canonical_issue_id": issue.canonical_issue_id,
        "priority_score": issue.priority_score,
        "priority_breakdown": issue.priority_breakdown,
        "resolution_notes": issue.resolution_notes,
        "created_at": issue.created_at,
        "updated_at": issue.updated_at,
        "verified_at": issue.verified_at,
        "resolved_at": issue.resolved_at,
        "closed_at": issue.closed_at,
        "photos": [
            {
                "id": p.id,
                "photo_url": p.photo_url,
                "photo_type": p.photo_type,
                "caption": p.caption,
                "created_at": p.created_at
            }
            for p in issue.photos
        ],
        "assignments": assignments_out,
        "updates": updates_out,
        "comments": comments_out,
        "duplicate_candidates": dup_list
    }

@router.get("", response_model=IssueListResponse)
def list_issues(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[IssueCategory] = None,
    status: Optional[IssueStatus] = None,
    severity: Optional[IssueSeverity] = None,
    ward_id: Optional[int] = None,
    reporter_id: Optional[int] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|priority_score|status|severity)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: Optional[User] = Depends(get_current_active_user_optional)
):
    query = db.query(Issue)

    if reporter_id:
        query = query.filter(Issue.reporter_id == reporter_id)

    if category:
        query = query.filter(Issue.category == category)
    if status:
        query = query.filter(Issue.status == status)
    if severity:
        query = query.filter(Issue.severity == severity)
    if ward_id:
        query = query.filter(Issue.ward_id == ward_id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Issue.ticket_id.ilike(s),
                Issue.title.ilike(s),
                Issue.description.ilike(s),
                Issue.address_text.ilike(s)
            )
        )

    sort_column = getattr(Issue, sort_by, Issue.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "items": [serialize_issue_detail(item, db, current_user) for item in items]
    }

@router.get("/map", response_model=List[MapIssueOut])
def get_map_issues(
    db: Session = Depends(get_db),
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lon: Optional[float] = None,
    max_lon: Optional[float] = None,
    category: Optional[IssueCategory] = None,
    status: Optional[IssueStatus] = None,
    severity: Optional[IssueSeverity] = None,
    ward_id: Optional[int] = None,
    limit: int = Query(300, ge=10, le=1000)
):
    query = db.query(Issue)

    if min_lat is not None and max_lat is not None:
        query = query.filter(Issue.latitude >= min_lat, Issue.latitude <= max_lat)
    if min_lon is not None and max_lon is not None:
        query = query.filter(Issue.longitude >= min_lon, Issue.longitude <= max_lon)

    if category:
        query = query.filter(Issue.category == category)
    if status:
        query = query.filter(Issue.status == status)
    if severity:
        query = query.filter(Issue.severity == severity)
    if ward_id:
        query = query.filter(Issue.ward_id == ward_id)

    issues = query.order_by(desc(Issue.priority_score)).limit(limit).all()

    results = []
    for issue in issues:
        p_band = 'LOW'
        if issue.priority_score >= 75.0 or issue.severity == IssueSeverity.CRITICAL:
            p_band = 'CRITICAL'
        elif issue.priority_score >= 55.0:
            p_band = 'HIGH'
        elif issue.priority_score >= 35.0:
            p_band = 'MEDIUM'

        results.append({
            "id": issue.id,
            "ticket_id": issue.ticket_id,
            "title": issue.title,
            "category": issue.category,
            "severity": issue.severity,
            "status": issue.status,
            "latitude": issue.latitude,
            "longitude": issue.longitude,
            "priority_score": issue.priority_score,
            "priority_band": p_band,
            "address_text": issue.address_text,
            "ward_name": issue.ward.name if issue.ward else None,
            "created_at": issue.created_at
        })
    return results

@router.post("", response_model=IssueDetailOut, status_code=status.HTTP_201_CREATED)
def create_issue(
    issue_in: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket_id = generate_ticket_id(db)
    now = datetime.now(timezone.utc)

    p_calc = calculate_priority_score(
        severity=issue_in.severity.value,
        category=issue_in.category.value,
        created_at=now,
        corroboration_count=1,
        is_resolved=False
    )

    issue = Issue(
        id=str(uuid.uuid4()),
        ticket_id=ticket_id,
        title=issue_in.title,
        description=issue_in.description,
        category=issue_in.category,
        severity=issue_in.severity,
        status=IssueStatus.SUBMITTED,
        latitude=issue_in.latitude,
        longitude=issue_in.longitude,
        location_geom=f"SRID=4326;POINT({issue_in.longitude} {issue_in.latitude})",
        address_text=issue_in.address_text,
        ward_id=issue_in.ward_id,
        reporter_id=current_user.id,
        is_anonymous=issue_in.is_anonymous,
        priority_score=p_calc["score"],
        priority_breakdown=p_calc,
        created_at=now,
        updated_at=now
    )
    db.add(issue)
    db.flush()

    timeline = IssueUpdate(
        issue_id=issue.id,
        actor_id=current_user.id,
        from_status=None,
        to_status=IssueStatus.SUBMITTED,
        note="Citizen complaint submitted",
        created_at=now
    )
    db.add(timeline)

    candidates = find_duplicate_candidates(
        db=db,
        latitude=issue.latitude,
        longitude=issue.longitude,
        category=issue.category.value,
        description=issue.description,
        current_issue_id=issue.id,
        max_radius_meters=80.0
    )
    for cand in candidates:
        dup = IssueDuplicate(
            canonical_issue_id=cand["issue_id"],
            duplicate_issue_id=issue.id,
            confidence_score=cand["confidence_score"],
            status="CANDIDATE",
            created_at=now
        )
        db.add(dup)

    db.commit()
    db.refresh(issue)
    return serialize_issue_detail(issue, db, current_user)

@router.get("/{issue_id}", response_model=IssueDetailOut)
def get_issue(
    issue_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user_optional)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        issue = db.query(Issue).filter(Issue.ticket_id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    
    return serialize_issue_detail(issue, db, current_user)

@router.post("/{issue_id}/status", response_model=IssueDetailOut)
def update_issue_status(
    issue_id: str,
    payload: IssueStatusChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    
    if current_user.role == UserRole.CITIZEN and issue.reporter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update another citizen's issue")

    updated_issue = apply_status_transition(
        db=db,
        issue=issue,
        to_status=payload.status,
        actor=current_user,
        note=payload.note,
        resolution_notes=payload.resolution_notes
    )
    return serialize_issue_detail(updated_issue, db, current_user)

@router.post("/{issue_id}/verify", response_model=IssueDetailOut)
def verify_issue(
    issue_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MUNICIPAL_OFFICER, UserRole.ADMIN]))
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    
    updated = apply_status_transition(
        db=db,
        issue=issue,
        to_status=IssueStatus.VERIFIED,
        actor=current_user,
        note="Issue verified by municipal officer"
    )
    return serialize_issue_detail(updated, db, current_user)

@router.post("/{issue_id}/assign", response_model=IssueDetailOut)
def assign_issue(
    issue_id: str,
    assign_in: IssueAssignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MUNICIPAL_OFFICER, UserRole.ADMIN]))
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    
    now = datetime.now(timezone.utc)
    
    db.query(IssueAssignment).filter(
        IssueAssignment.issue_id == issue.id,
        IssueAssignment.is_current == True
    ).update({"is_current": False})

    assignment = IssueAssignment(
        issue_id=issue.id,
        department_id=assign_in.department_id,
        team_id=assign_in.team_id,
        assigned_to_user_id=assign_in.assigned_to_user_id,
        assigned_by_user_id=current_user.id,
        notes=assign_in.notes,
        is_current=True,
        assigned_at=now
    )
    db.add(assignment)

    if issue.status in [IssueStatus.SUBMITTED, IssueStatus.VERIFIED]:
        apply_status_transition(
            db=db,
            issue=issue,
            to_status=IssueStatus.ASSIGNED,
            actor=current_user,
            note="Assigned to department field team"
        )
    else:
        db.commit()
        db.refresh(issue)

    return serialize_issue_detail(issue, db, current_user)

@router.post("/{issue_id}/resolve", response_model=IssueDetailOut)
def resolve_issue(
    issue_id: str,
    resolution_notes: str = Form(...),
    evidence_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MUNICIPAL_OFFICER, UserRole.FIELD_WORKER, UserRole.ADMIN]))
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    
    now = datetime.now(timezone.utc)

    if evidence_photo:
        ext = os.path.splitext(evidence_photo.filename)[1].lower() or ".jpg"
        clean_filename = f"res_{uuid.uuid4().hex}{ext}"
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(settings.UPLOAD_DIR, clean_filename)
        
        with open(file_path, "wb") as f:
            f.write(evidence_photo.file.read())
            
        photo_record = IssuePhoto(
            issue_id=issue.id,
            photo_url=f"/api/v1/uploads/{clean_filename}",
            photo_type="RESOLUTION_EVIDENCE",
            caption="Resolution completion evidence",
            uploaded_by=current_user.id,
            created_at=now
        )
        db.add(photo_record)

    updated = apply_status_transition(
        db=db,
        issue=issue,
        to_status=IssueStatus.RESOLVED,
        actor=current_user,
        note="Resolution completed",
        resolution_notes=resolution_notes
    )
    return serialize_issue_detail(updated, db, current_user)

@router.post("/{issue_id}/reopen", response_model=IssueDetailOut)
def reopen_issue(
    issue_id: str,
    note: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    
    if current_user.role == UserRole.CITIZEN and issue.reporter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot reopen another citizen's complaint")

    updated = apply_status_transition(
        db=db,
        issue=issue,
        to_status=IssueStatus.REOPENED,
        actor=current_user,
        note=f"Reopened: {note}"
    )
    return serialize_issue_detail(updated, db, current_user)

@router.post("/{issue_id}/comments", response_model=IssueCommentOut)
def add_comment(
    issue_id: str,
    comment_in: IssueCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    
    is_internal = comment_in.is_internal and (current_user.role in [UserRole.MUNICIPAL_OFFICER, UserRole.ADMIN, UserRole.FIELD_WORKER])
    
    now = datetime.now(timezone.utc)
    comment = IssueComment(
        issue_id=issue.id,
        author_id=current_user.id,
        comment_text=comment_in.comment_text,
        is_internal=is_internal,
        created_at=now
    )
    db.add(comment)

    if not is_internal and issue.reporter_id != current_user.id:
        notif = Notification(
            user_id=issue.reporter_id,
            title=f"New Comment on {issue.ticket_id}",
            message=f"{current_user.full_name}: {comment_in.comment_text[:80]}",
            link=f"/my-complaints?id={issue.id}",
            event_type="COMMENT",
            created_at=now
        )
        db.add(notif)

    db.commit()
    db.refresh(comment)
    
    return {
        "id": comment.id,
        "author_id": current_user.id,
        "author_name": current_user.full_name,
        "author_role": current_user.role.value,
        "comment_text": comment.comment_text,
        "is_internal": comment.is_internal,
        "created_at": comment.created_at
    }

@router.post("/{issue_id}/photos", response_model=IssuePhotoOut)
def upload_photo(
    issue_id: str,
    file: UploadFile = File(...),
    photo_type: str = Form("REPORT"),
    caption: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {settings.ALLOWED_IMAGE_TYPES}"
        )

    contents = file.file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB"
        )

    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    clean_filename = f"img_{uuid.uuid4().hex}{ext}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, clean_filename)
    
    with open(file_path, "wb") as f:
        f.write(contents)

    now = datetime.now(timezone.utc)
    photo = IssuePhoto(
        issue_id=issue.id,
        photo_url=f"/api/v1/uploads/{clean_filename}",
        photo_type=photo_type,
        caption=caption,
        uploaded_by=current_user.id,
        created_at=now
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return photo

@router.post("/{issue_id}/duplicates/{candidate_id}/confirm")
def confirm_duplicate(
    issue_id: str,
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MUNICIPAL_OFFICER, UserRole.ADMIN]))
):
    dup = db.query(IssueDuplicate).filter(IssueDuplicate.id == candidate_id).first()
    if not dup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duplicate candidate not found")
    
    now = datetime.now(timezone.utc)
    dup.status = "CONFIRMED"
    dup.reviewed_by = current_user.id
    dup.reviewed_at = now

    dup_issue = db.query(Issue).filter(Issue.id == dup.duplicate_issue_id).first()
    if dup_issue:
        dup_issue.canonical_issue_id = dup.canonical_issue_id

    canonical = db.query(Issue).filter(Issue.id == dup.canonical_issue_id).first()
    if canonical:
        confirmed_count = db.query(IssueDuplicate).filter(
            IssueDuplicate.canonical_issue_id == canonical.id,
            IssueDuplicate.status == "CONFIRMED"
        ).count() + 1
        
        p_calc = calculate_priority_score(
            severity=canonical.severity.value,
            category=canonical.category.value,
            created_at=canonical.created_at,
            corroboration_count=confirmed_count,
            is_resolved=(canonical.status in [IssueStatus.RESOLVED, IssueStatus.CLOSED])
        )
        canonical.priority_score = p_calc["score"]
        canonical.priority_breakdown = p_calc

    db.commit()
    return {"message": "Duplicate relationship confirmed", "candidate_id": candidate_id}

@router.post("/{issue_id}/duplicates/{candidate_id}/reject")
def reject_duplicate(
    issue_id: str,
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MUNICIPAL_OFFICER, UserRole.ADMIN]))
):
    dup = db.query(IssueDuplicate).filter(IssueDuplicate.id == candidate_id).first()
    if not dup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duplicate candidate not found")
    
    dup.status = "REJECTED"
    dup.reviewed_by = current_user.id
    dup.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Duplicate relationship rejected", "candidate_id": candidate_id}
