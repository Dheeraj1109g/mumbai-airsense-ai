from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.models.station import MonitoringStation
from app.models.observation import Observation
from app.models.model_meta import ModelVersion
from app.schemas.health import SystemHealthResponse
from app.core.config import settings

router = APIRouter()

@router.get("/health", response_model=SystemHealthResponse, summary="System Health & Diagnostic Status")
def get_health(db: Session = Depends(get_db)):
    """
    Returns application health, database connectivity status,
    active monitoring stations count, and total observation records.
    """
    db_status = "healthy"
    engine_name = "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    stn_count = db.query(MonitoringStation).count()
    obs_count = db.query(Observation).count()
    model_count = db.query(ModelVersion).filter(ModelVersion.is_active == True).count()
    
    # Latest observation date in the database
    latest_obs = db.query(Observation).order_by(Observation.observation_date.desc()).first()
    latest_date_str = latest_obs.observation_date.isoformat() if latest_obs else None

    return SystemHealthResponse(
        status="operational",
        project_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        database_status=db_status,
        database_engine=engine_name,
        active_stations_count=stn_count,
        total_observations_count=obs_count,
        trained_models_count=model_count,
        latest_observation_date=latest_date_str,
        data_provenance_mode="cpcb_verified_archive" if not settings.CPCB_API_KEY else "cpcb_live_api"
    )
