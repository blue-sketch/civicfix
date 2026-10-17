from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class SavedRouteCreate(BaseModel):
    name: str
    waypoints_geojson: Dict[str, Any]
    total_distance_km: float

class SavedRouteOut(BaseModel):
    id: int
    name: str
    created_by: int
    creator_name: Optional[str] = None
    waypoints_geojson: Dict[str, Any]
    total_distance_km: float
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    event_type: str
    created_at: datetime

    class Config:
        from_attributes = True
