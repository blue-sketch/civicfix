from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.db.session import get_db
from app.models.department import Department
from app.models.issue import AuditLog
from app.models.user import User, UserRole
from app.schemas.user import UserOut

router = APIRouter(prefix="/users", tags=["Users"])


class OfficerDepartmentUpdate(BaseModel):
    department_id: Optional[int] = Field(...)


@router.get("/officers", response_model=List[UserOut])
def list_officers(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role([UserRole.ADMIN])),
):
    return (
        db.query(User)
        .filter(User.role == UserRole.MUNICIPAL_OFFICER)
        .order_by(User.full_name.asc())
        .all()
    )


@router.patch("/{user_id}/department", response_model=UserOut)
def update_officer_department(
    user_id: int,
    update: OfficerDepartmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role([UserRole.ADMIN])),
):
    officer = db.query(User).filter(User.id == user_id).first()
    if not officer or officer.role != UserRole.MUNICIPAL_OFFICER:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Municipal officer not found")

    department = None
    if update.department_id is not None:
        department = db.query(Department).filter(Department.id == update.department_id).first()
        if not department:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    previous_department_id = officer.department_id
    officer.department_id = update.department_id
    db.add(AuditLog(
        actor_id=admin.id,
        action="OFFICER_DEPARTMENT_UPDATED",
        target_type="USER",
        target_id=str(officer.id),
        details_json={
            "officer_name": officer.full_name,
            "previous_department_id": previous_department_id,
            "department_id": update.department_id,
            "department_name": department.name if department else None,
        },
    ))
    db.commit()
    db.refresh(officer)
    return officer
