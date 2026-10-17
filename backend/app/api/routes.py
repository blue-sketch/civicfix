from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.issue import SavedRoute, Notification
from app.models.user import User, UserRole
from app.schemas.route import SavedRouteCreate, SavedRouteOut, NotificationOut
from app.api.deps import get_current_user

router = APIRouter(tags=["Routes & Inspection"])

@router.get("/routes", response_model=List[SavedRouteOut])
def list_saved_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    routes = db.query(SavedRoute).order_by(SavedRoute.created_at.desc()).all()
    results = []
    for r in routes:
        results.append({
            "id": r.id,
            "name": r.name,
            "created_by": r.created_by,
            "creator_name": r.creator.full_name if r.creator else "Officer",
            "waypoints_geojson": r.waypoints_geojson,
            "total_distance_km": r.total_distance_km,
            "created_at": r.created_at
        })
    return results

@router.post("/routes", response_model=SavedRouteOut, status_code=status.HTTP_201_CREATED)
def create_saved_route(
    route_in: SavedRouteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    route = SavedRoute(
        name=route_in.name,
        created_by=current_user.id,
        waypoints_geojson=route_in.waypoints_geojson,
        total_distance_km=route_in.total_distance_km
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return {
        "id": route.id,
        "name": route.name,
        "created_by": route.created_by,
        "creator_name": current_user.full_name,
        "waypoints_geojson": route.waypoints_geojson,
        "total_distance_km": route.total_distance_km,
        "created_at": route.created_at
    }

@router.delete("/routes/{route_id}")
def delete_saved_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    route = db.query(SavedRoute).filter(SavedRoute.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    
    if route.created_by != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.MUNICIPAL_OFFICER]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this route")
        
    db.delete(route)
    db.commit()
    return {"message": "Route deleted successfully"}
