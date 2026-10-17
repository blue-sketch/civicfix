from datetime import datetime, timezone
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.issue import (
    Issue, IssueStatus, IssueUpdate, Notification,
    IssueAssignment, IssuePhoto, AuditLog
)
from app.models.user import User, UserRole
from app.services.priority_engine import calculate_priority_score

# Valid transitions map
VALID_TRANSITIONS = {
    IssueStatus.SUBMITTED: [IssueStatus.VERIFIED, IssueStatus.REJECTED],
    IssueStatus.VERIFIED: [IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS, IssueStatus.REJECTED],
    IssueStatus.ASSIGNED: [IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED, IssueStatus.VERIFIED],
    IssueStatus.IN_PROGRESS: [IssueStatus.RESOLVED, IssueStatus.ASSIGNED],
    IssueStatus.RESOLVED: [IssueStatus.CLOSED, IssueStatus.REOPENED],
    IssueStatus.CLOSED: [IssueStatus.REOPENED],
    IssueStatus.REOPENED: [IssueStatus.VERIFIED, IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS],
    IssueStatus.REJECTED: [IssueStatus.REOPENED],
}

def can_transition(from_status: IssueStatus, to_status: IssueStatus, user_role: UserRole) -> bool:
    if from_status == to_status:
        return True
    
    # Admins have master override capability
    if user_role == UserRole.ADMIN:
        return True
        
    allowed = VALID_TRANSITIONS.get(from_status, [])
    if to_status not in allowed:
        return False
        
    # Citizens can only reopen their resolved/closed issues
    if user_role == UserRole.CITIZEN:
        if to_status == IssueStatus.REOPENED and from_status in [IssueStatus.RESOLVED, IssueStatus.CLOSED]:
            return True
        return False
        
    return True

def apply_status_transition(
    db: Session,
    issue: Issue,
    to_status: IssueStatus,
    actor: User,
    note: Optional[str] = None,
    resolution_notes: Optional[str] = None
) -> Issue:
    from_status = issue.status
    if from_status != to_status and not can_transition(from_status, to_status, actor.role):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state transition from {from_status.value} to {to_status.value} for role {actor.role.value}"
        )

    # Resolution requires explanation
    if to_status == IssueStatus.RESOLVED and not (resolution_notes or note or issue.resolution_notes):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resolution notes are required when marking an issue as RESOLVED"
        )

    now = datetime.now(timezone.utc)
    issue.status = to_status
    issue.updated_at = now

    if to_status == IssueStatus.VERIFIED and not issue.verified_at:
        issue.verified_at = now
    elif to_status == IssueStatus.RESOLVED:
        issue.resolved_at = now
        if resolution_notes:
            issue.resolution_notes = resolution_notes
        elif note:
            issue.resolution_notes = note
    elif to_status == IssueStatus.CLOSED:
        issue.closed_at = now

    # Record IssueUpdate timeline entry
    timeline_entry = IssueUpdate(
        issue_id=issue.id,
        actor_id=actor.id,
        from_status=from_status,
        to_status=to_status,
        note=note or resolution_notes or f"Status updated from {from_status.value} to {to_status.value}",
        created_at=now
    )
    db.add(timeline_entry)

    # Update Priority calculation
    p_calc = calculate_priority_score(
        severity=issue.severity.value,
        category=issue.category.value,
        created_at=issue.created_at,
        is_resolved=(to_status in [IssueStatus.RESOLVED, IssueStatus.CLOSED])
    )
    issue.priority_score = p_calc['score']
    issue.priority_breakdown = p_calc

    # Dispatch notification to citizen reporter
    if issue.reporter_id != actor.id:
        notif = Notification(
            user_id=issue.reporter_id,
            title=f"Complaint {issue.ticket_id} Updated",
            message=f"Your report has been updated to {to_status.value}. {note or ''}",
            link=f"/my-complaints?id={issue.id}",
            event_type="STATUS_UPDATE",
            created_at=now
        )
        db.add(notif)

    # Audit log entry
    audit = AuditLog(
        actor_id=actor.id,
        action="STATUS_TRANSITION",
        target_type="ISSUE",
        target_id=issue.id,
        details_json={
            'ticket_id': issue.ticket_id,
            'from_status': from_status.value,
            'to_status': to_status.value,
            'note': note
        },
        created_at=now
    )
    db.add(audit)

    db.commit()
    db.refresh(issue)
    return issue
