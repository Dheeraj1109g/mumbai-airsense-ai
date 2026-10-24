from typing import List, Optional
from pydantic import BaseModel

class HealthCategoryGuidance(BaseModel):
    category: str
    aqi_range: str
    color_code: str
    severity: str
    general_population_advice: str
    sensitive_groups_advice: str
    outdoor_activity_recommendation: str
    official_source: str
    source_url: str
    verified_date: str

class SystemHealthResponse(BaseModel):
    status: str
    project_name: str
    version: str
    database_status: str
    database_engine: str
    active_stations_count: int
    total_observations_count: int
    trained_models_count: int
    latest_observation_date: Optional[str] = None
    data_provenance_mode: str
