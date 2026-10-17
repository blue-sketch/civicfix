from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.department import Department, Team, Ward
from app.models.user import User, UserRole
from app.api.deps import get_current_user, require_role

router = APIRouter(tags=["Teams & Organization"])

class DepartmentOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    class Config:
        from_attributes = True

class TeamMemberOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: str

class TeamOut(BaseModel):
    id: int
    name: str
    department_id: int
    department_name: Optional[str] = None
    leader_name: Optional[str] = None
    members: List[TeamMemberOut] = []

class WardOut(BaseModel):
    id: int
    name: str
    code: str
    zone: str
    class Config:
        from_attributes = True

@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()

@router.get("/wards", response_model=List[WardOut])
def list_wards(db: Session = Depends(get_db)):
    return db.query(Ward).all()

@router.get("/teams", response_model=List[TeamOut])
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    results = []
    for t in teams:
        members_out = [
            {
                "id": m.id,
                "full_name": m.full_name,
                "email": m.email,
                "role": m.role.value
            }
            for m in t.members
        ]
        results.append({
            "id": t.id,
            "name": t.name,
            "department_id": t.department_id,
            "department_name": t.department.name if t.department else None,
            "leader_name": t.leader.full_name if t.leader else None,
            "members": members_out
        })
    return results
