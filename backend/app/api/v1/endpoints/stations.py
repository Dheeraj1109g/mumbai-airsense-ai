from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.station import MonitoringStation
from app.models.observation import Observation
from app.schemas.station import StationOut

router = APIRouter()

@router.get("", response_model=List[StationOut], summary="List Monitoring Stations")
def get_stations(
    city: Optional[str] = Query(None, description="Filter by city e.g. Mumbai, Navi Mumbai"),
    status: Optional[str] = Query(None, description="Filter by status e.g. Active"),
    db: Session = Depends(get_db)
):
    query = db.query(MonitoringStation)
    if city:
        query = query.filter(MonitoringStation.city.ilike(f"%{city}%"))
    if status:
        query = query.filter(MonitoringStation.status.ilike(status))
    return query.order_by(MonitoringStation.station_name).all()

@router.get("/{station_id}", response_model=StationOut, summary="Get Station Details")
def get_station(station_id: str, db: Session = Depends(get_db)):
    station = db.query(MonitoringStation).filter(MonitoringStation.station_id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"Monitoring station '{station_id}' not found.")
    return station
