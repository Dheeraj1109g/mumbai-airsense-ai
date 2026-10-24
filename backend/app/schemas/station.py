from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class StationBase(BaseModel):
    station_id: str
    station_name: str
    city: str = "Mumbai"
    state: str = "Maharashtra"
    latitude: float
    longitude: float
    operator: str = "MPCB"
    status: str = "Active"
    area_type: str = "Urban"

class StationCreate(StationBase):
    pass

class StationOut(StationBase):
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class StationMapItem(StationBase):
    latest_observation_date: Optional[str] = None
    latest_aqi: Optional[float] = None
    latest_bucket: Optional[str] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    so2: Optional[float] = None
    co: Optional[float] = None
    o3: Optional[float] = None
    prominent_pollutant: Optional[str] = None
    data_freshness_status: str = "available"  # available | stale | missing
    has_active_forecast: bool = False
