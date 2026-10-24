from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.schemas.forecast import ForecastRequest, ForecastResponse, MultiModelForecastComparisonResponse
from app.services.forecast_service import generate_forecast, compare_all_models
from app.models.forecast import ForecastRun, ForecastValue

router = APIRouter()

@router.post("", response_model=ForecastResponse, summary="Generate 7-Day Air Quality Forecast")
def create_forecast(
    req: ForecastRequest,
    db: Session = Depends(get_db)
):
    """
    Generates a 7-day forecast for the requested monitoring station and pollutant,
    derives predicted Indian AQI categories, stores the run, and returns 95% uncertainty intervals.
    """
    try:
        return generate_forecast(
            db,
            station_id=req.station_id,
            pollutant=req.pollutant,
            model_code=req.model_code,
            horizon_days=req.horizon_days
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting engine error: {str(e)}")

@router.get("/compare", response_model=MultiModelForecastComparisonResponse, summary="Compare All Forecasting Models")
def compare_forecasts(
    station_id: str = Query("MH005", description="Monitoring station ID"),
    pollutant: str = Query("PM2.5", description="Target pollutant"),
    horizon_days: int = Query(7, ge=1, le=14),
    db: Session = Depends(get_db)
):
    """
    Generates simultaneous 7-day forecasts for ARIMA, Prophet, LSTM, and Baseline,
    displaying side-by-side curves and test performance metrics.
    """
    try:
        return compare_all_models(
            db,
            station_id=station_id,
            pollutant=pollutant,
            horizon_days=horizon_days
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison engine error: {str(e)}")

@router.get("/history", summary="List Previous Forecast Runs")
def list_forecast_runs(
    station_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Returns the audit trail of recently executed forecast runs.
    """
    q = db.query(ForecastRun)
    if station_id:
        q = q.filter(ForecastRun.station_id == station_id)
    runs = q.order_by(desc(ForecastRun.run_timestamp)).limit(limit).all()
    
    out = []
    for r in runs:
        out.append({
            "run_id": r.id,
            "station_id": r.station_id,
            "target_pollutant": r.target_pollutant,
            "horizon_days": r.horizon_days,
            "run_timestamp": r.run_timestamp.isoformat() if r.run_timestamp else None,
            "model_version_id": r.model_version_id
        })
    return out
