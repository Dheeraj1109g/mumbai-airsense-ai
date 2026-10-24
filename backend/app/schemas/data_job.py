from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DataImportJobOut(BaseModel):
    id: int
    source_type: str
    file_name: Optional[str] = None
    records_imported: int
    records_skipped: int
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_log: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class DataSourceInfo(BaseModel):
    source_id: str
    title: str
    organization: str
    type: str  # "official_caaqms" | "open_data" | "api"
    license: str
    coverage_period: str
    parameters: List[str]
    access_status: str
    url: str
    notes: str
