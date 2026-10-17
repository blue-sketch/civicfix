from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.db.session import get_db
from app.models.issue import Issue, IssueStatus, IssueCategory, IssueAssignment
from app.models.department import Ward, Team, Department
from app.schemas.analytics import OverviewMetrics, CategoryCount, StatusCount, TrendPoint, WardMetric, TeamMetric

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=OverviewMetrics)
def get_analytics_overview(db: Session = Depends(get_db)):
    total = db.query(Issue).count()
    
    open_count = db.query(Issue).filter(
        Issue.status.notin_([IssueStatus.RESOLVED, IssueStatus.CLOSED, IssueStatus.REJECTED])
    ).count()

    high_pri_count = db.query(Issue).filter(
        Issue.status.notin_([IssueStatus.RESOLVED, IssueStatus.CLOSED, IssueStatus.REJECTED]),
        Issue.priority_score >= 55.0
    ).count()

    now = datetime.now(timezone.utc)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    resolved_month_count = db.query(Issue).filter(
        Issue.status.in_([IssueStatus.RESOLVED, IssueStatus.CLOSED]),
        Issue.resolved_at >= first_of_month
    ).count()

    seven_days_ago = now - timedelta(days=7)
    overdue_count = db.query(Issue).filter(
        Issue.status.notin_([IssueStatus.RESOLVED, IssueStatus.CLOSED, IssueStatus.REJECTED]),
        Issue.created_at <= seven_days_ago
    ).count()

    resolution_times = db.execute(text("""
        SELECT EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0 as hours
        FROM issues
        WHERE resolved_at IS NOT NULL AND status IN ('RESOLVED', 'CLOSED');
    """)).fetchall()

    hours_list = [float(r[0]) for r in resolution_times if r[0] is not None and r[0] >= 0]
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
def get_category_metrics(db: Session = Depends(get_db)):
    total = db.query(Issue).count()
    results = db.query(
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
def get_status_metrics(db: Session = Depends(get_db)):
    results = db.query(
        Issue.status, func.count(Issue.id)
    ).group_by(Issue.status).all()

    counts_map = {s.value: 0 for s in IssueStatus}
    for stat, count in results:
        stat_name = stat.value if hasattr(stat, 'value') else str(stat)
        counts_map[stat_name] = count

    return [{"status": k, "count": v} for k, v in counts_map.items()]

@router.get("/trends", response_model=List[TrendPoint])
def get_resolution_trends(db: Session = Depends(get_db), days: int = 14):
    now = datetime.now(timezone.utc)
    dates = [(now - timedelta(days=i)).strftime("%b %d") for i in range(days - 1, -1, -1)]
    
    submissions = db.execute(text("""
        SELECT TO_CHAR(created_at, 'Mon DD') as dt, COUNT(*) as c
        FROM issues
        WHERE created_at >= NOW() - (:days || ' days')::INTERVAL
        GROUP BY dt;
    """), {"days": days}).fetchall()
    sub_map = {r[0]: r[1] for r in submissions}

    resolutions = db.execute(text("""
        SELECT TO_CHAR(resolved_at, 'Mon DD') as dt, COUNT(*) as c
        FROM issues
        WHERE resolved_at >= NOW() - (:days || ' days')::INTERVAL
        GROUP BY dt;
    """), {"days": days}).fetchall()
    res_map = {r[0]: r[1] for r in resolutions}

    trend = []
    for d in dates:
        trend.append({
            "date": d,
            "submitted": sub_map.get(d, 0),
            "resolved": res_map.get(d, 0)
        })
    return trend

@router.get("/wards", response_model=List[WardMetric])
def get_ward_metrics(db: Session = Depends(get_db)):
    wards = db.query(Ward).all()
    output = []
    for w in wards:
        total = db.query(Issue).filter(Issue.ward_id == w.id).count()
        resolved = db.query(Issue).filter(
            Issue.ward_id == w.id,
            Issue.status.in_([IssueStatus.RESOLVED, IssueStatus.CLOSED])
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
def get_team_metrics(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    output = []
    for t in teams:
        active = db.query(IssueAssignment).join(Issue).filter(
            IssueAssignment.team_id == t.id,
            IssueAssignment.is_current == True,
            Issue.status.notin_([IssueStatus.RESOLVED, IssueStatus.CLOSED, IssueStatus.REJECTED])
        ).count()

        resolved = db.query(IssueAssignment).join(Issue).filter(
            IssueAssignment.team_id == t.id,
            Issue.status.in_([IssueStatus.RESOLVED, IssueStatus.CLOSED])
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
