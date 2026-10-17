from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class OverviewMetrics(BaseModel):
    total_reports: int
    open_issues: int
    high_priority_issues: int
    resolved_this_month: int
    avg_resolution_hours: float
    median_resolution_hours: float
    overdue_issues: int
    resolution_rate_percent: float

class CategoryCount(BaseModel):
    category: str
    count: int
    percentage: float

class StatusCount(BaseModel):
    status: str
    count: int

class TrendPoint(BaseModel):
    date: str
    submitted: int
    resolved: int

class WardMetric(BaseModel):
    ward_id: int
    ward_name: str
    open_count: int
    resolved_count: int
    total_count: int

class TeamMetric(BaseModel):
    team_id: int
    team_name: str
    department_name: str
    active_tasks: int
    resolved_tasks: int
