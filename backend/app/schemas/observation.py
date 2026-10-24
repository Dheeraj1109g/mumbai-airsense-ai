from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class ObservationBase(BaseModel):
    station_id: str
    observation_date: date
    observation_time: Optional[datetime] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    so2: Optional[float] = None
    co: Optional[float] = None
    o3: Optional[float] = None
    nh3: Optional[float] = None
    official_aqi: Optional[float] = None
    official_bucket: Optional[str] = None
    calculated_aqi: Optional[float] = None
    calculated_bucket: Optional[str] = None
    prominent_pollutant: Optional[str] = None
    data_provenance: str = "cpcb_historical_archive"

class ObservationCreate(ObservationBase):
    pass

class ObservationOut(ObservationBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class LatestAQISummary(BaseModel):
    mumbai_aqi: Optional[float] = None
    mumbai_bucket: Optional[str] = None
    observation_date: Optional[str] = None
    data_provenance: str = "cpcb_historical_archive"
    active_stations_reporting: int = 0
    total_stations: int = 0
    most_polluted_station: Optional[dict] = None
    least_polluted_station: Optional[dict] = None
    prominent_pollutant_citywide: Optional[str] = None
    pollutant_distribution: dict = {}
    data_freshness_warning: Optional[str] = None
