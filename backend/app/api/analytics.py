from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text, or_, and_
from app.db.session import get_db
from app.models.issue import Issue, IssueStatus, IssueCategory, IssueAssignment
from app.models.department import Ward, Team, Department
from app.models.user import User, UserRole
from app.schemas.analytics import OverviewMetrics, CategoryCount, StatusCount, TrendPoint, WardMetric, TeamMetric
from app.api.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

def get_base_issue_query(db: Session, current_user: User):
    if current_user.role == UserRole.CITIZEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Citizens are not authorized to access operational analytics"
        )
    
    query = db.query(Issue)
    if current_user.role == UserRole.MUNICIPAL_OFFICER:
        if not current_user.department_id:
            return query.filter(Issue.id == "NO_MATCH_NO_DEPT")
        query = query.filter(
            or_(
                Issue.department_id == current_user.department_id,
                Issue.assignments.any(
                    and_(
                        IssueAssignment.department_id == current_user.department_id,
                        IssueAssignment.is_current == True
                    )
                )
            )
        )
    return query

@router.get("/overview", response_model=OverviewMetrics)
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = get_base_issue_query(db, current_user)
    total = query.count()
    
    open_count = query.filter(
        Issue.status.notin_([IssueStatus.RESOLVED, IssueStatus.CERTIFIED, IssueStatus.CLOSED, IssueStatus.REJECTED])
    ).count()

    high_pri_count = query.filter(
        Issue.status.notin_([IssueStatus.RESOLVED, IssueStatus.CERTIFIED, IssueStatus.CLOSED, IssueStatus.REJECTED]),
        Issue.priority_score >= 55.0
    ).count()

    now = datetime.now(timezone.utc)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    resolved_month_count = query.filter(
        Issue.status.in_([IssueStatus.RESOLVED, IssueStatus.CERTIFIED, IssueStatus.CLOSED]),
        Issue.resolved_at >= first_of_month
    ).count()

    seven_days_ago = now - timedelta(days=7)
    overdue_count = query.filter(
        Issue.status.notin_([IssueStatus.RESOLVED, IssueStatus.CERTIFIED, IssueStatus.CLOSED, IssueStatus.REJECTED]),
        Issue.created_at <= seven_days_ago
    ).count()

    # Resolution hours calculation
    resolved_issues = query.filter(
        Issue.resolved_at.isnot(None),
        Issue.status.in_([IssueStatus.RESOLVED, IssueStatus.CERTIFIED, IssueStatus.CLOSED])
    ).all()

    hours_list = []
    for iss in resolved_issues:
        if iss.resolved_at and iss.created_at:
            diff_h = (iss.resolved_at - iss.created_at).total_seconds() / 3600.0
            if diff_h >= 0:
                hours_list.append(diff_h)

    if hours_list:
        avg_hours = round(sum(hours_list) / len(hours_list), 1)
        sorted_hours = sorted(hours_list)
        mid = len(sorted_hours) // 2
        median_hours = round((sorted_hours[mid] if len(sorted_hours) % 2 != 0 else (sorted_hours[mid-1] + sorted_hours[mid]) / 2.0), 1)
    else:
        avg_hours = 0.0
        median_hours = 0.0

    resolution_rate = round((len(hours_list) / total * 100.0), 1) if total > 0 else 0.0

    return {
        "total_reports": total,
        "open_issues": open_count,
        "high_priority_issues": high_pri_count,
        "resolved_this_month": resolved_month_count,
        "avg_resolution_hours": avg_hours,
        "median_resolution_hours": median_hours,
        "overdue_issues": overdue_count,
        "resolution_rate_percent": resolution_rate
    }

@router.get("/categories", response_model=List[CategoryCount])
def get_category_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = get_base_issue_query(db, current_user)
    total = query.count()
    results = query.with_entities(
        Issue.category, func.count(Issue.id)
    ).group_by(Issue.category).all()

    output = []
    for cat, count in results:
        pct = round((count / total * 100.0), 1) if total > 0 else 0.0
        output.append({
            "category": cat.value if hasattr(cat, 'value') else str(cat),
            "count": count,
            "percentage": pct
        })
    output.sort(key=lambda x: x["count"], reverse=True)
    return output

@router.get("/statuses", response_model=List[StatusCount])
def get_status_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = get_base_issue_query(db, current_user)
    results = query.with_entities(
        Issue.status, func.count(Issue.id)
    ).group_by(Issue.status).all()

    counts_map = {s.value: 0 for s in IssueStatus}
    for stat, count in results:
        stat_name = stat.value if hasattr(stat, 'value') else str(stat)
        counts_map[stat_name] = count

    return [{"status": k, "count": v} for k, v in counts_map.items()]

@router.get("/trends", response_model=List[TrendPoint])
def get_resolution_trends(
    db: Session = Depends(get_db),
    days: int = 14,
    current_user: User = Depends(get_current_user)
):
    query = get_base_issue_query(db, current_user)
    now = datetime.now(timezone.utc)
    dates = [(now - timedelta(days=i)).strftime("%b %d") for i in range(days - 1, -1, -1)]
    start_date = now - timedelta(days=days)

    recent_issues = query.filter(
        or_(
            Issue.created_at >= start_date,
            Issue.resolved_at >= start_date
        )
    ).all()

    sub_map = {}
    res_map = {}
    for iss in recent_issues:
        if iss.created_at and iss.created_at >= start_date:
            d_sub = iss.created_at.strftime("%b %d")
            sub_map[d_sub] = sub_map.get(d_sub, 0) + 1
        if iss.resolved_at and iss.resolved_at >= start_date:
            d_res = iss.resolved_at.strftime("%b %d")
            res_map[d_res] = res_map.get(d_res, 0) + 1

    trend = []
    for d in dates:
        trend.append({
            "date": d,
            "submitted": sub_map.get(d, 0),
            "resolved": res_map.get(d, 0)
        })
    return trend

@router.get("/wards", response_model=List[WardMetric])
def get_ward_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    base_query = get_base_issue_query(db, current_user)
    wards = db.query(Ward).all()
    output = []
    for w in wards:
        total = base_query.filter(Issue.ward_id == w.id).count()
        resolved = base_query.filter(
            Issue.ward_id == w.id,
            Issue.status.in_([IssueStatus.RESOLVED, IssueStatus.CERTIFIED, IssueStatus.CLOSED])
        ).count()
        open_c = total - resolved
        output.append({
            "ward_id": w.id,
            "ward_name": w.name,
            "open_count": open_c,
            "resolved_count": resolved,
            "total_count": total
        })
    output.sort(key=lambda x: x["total_count"], reverse=True)
    return output

@router.get("/teams", response_model=List[TeamMetric])
def get_team_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.CITIZEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    team_query = db.query(Team)
    if current_user.role == UserRole.MUNICIPAL_OFFICER:
        if not current_user.department_id:
            return []
        team_query = team_query.filter(Team.department_id == current_user.department_id)

    teams = team_query.all()
    output = []
    for t in teams:
        active = db.query(IssueAssignment).join(Issue).filter(
            IssueAssignment.team_id == t.id,
            IssueAssignment.is_current == True,
            Issue.status.notin_([IssueStatus.RESOLVED, IssueStatus.CERTIFIED, IssueStatus.CLOSED, IssueStatus.REJECTED])
        ).count()

        resolved = db.query(IssueAssignment).join(Issue).filter(
            IssueAssignment.team_id == t.id,
            Issue.status.in_([IssueStatus.RESOLVED, IssueStatus.CERTIFIED, IssueStatus.CLOSED])
        ).count()

        dept_name = t.department.name if t.department else "Public Works"
        output.append({
            "team_id": t.id,
            "team_name": t.name,
            "department_name": dept_name,
            "active_tasks": active,
            "resolved_tasks": resolved
        })
    return output
