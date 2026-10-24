from typing import List, Optional
from fastapi import APIRouter, Query
from app.services.live_telemetry_service import (
    get_live_mumbai_summary,
    get_live_map_items,
    get_live_7day_forecast,
    get_live_model_comparison,
    get_all_live_stations
)
from app.schemas.observation import LatestAQISummary
from app.schemas.station import StationMapItem
from app.schemas.forecast import ForecastResponse, MultiModelForecastComparisonResponse

router = APIRouter()

@router.get("/summary", response_model=LatestAQISummary, summary="Live Real-Time Mumbai AQI Overview (Today)")
def get_live_summary(
    station_id: Optional[str] = Query(None, description="Optional station ID filter; defaults to Mumbai composite")
):
    """
    Returns real-time air quality observations for Mumbai right now,
    calculating statutory Indian CPCB NAQI sub-indices from live telemetry.
    """
    return get_live_mumbai_summary(station_id)

@router.get("/map", response_model=List[StationMapItem], summary="Live Real-Time Map Station Telemetry")
def get_live_map():
    """
    Returns live real-time AQI and pollutant concentrations for all
    13 CAAQMS stations across Mumbai for the interactive Leaflet map.
    """
    return get_live_map_items()

@router.get("/forecast", response_model=ForecastResponse, summary="Live 7-Day Forecast from Today Forward")
def get_live_forecast(
    station_id: str = Query("MH005", description="Monitoring station ID"),
    pollutant: str = Query("PM2.5", description="Target pollutant"),
    model_code: str = Query("arima", description="Forecasting model code"),
    horizon_days: int = Query(7, ge=1, le=14, description="Forecast horizon in days")
):
    """
    Returns real-time 7-day predictive forecast starting from today forward.
    """
    return get_live_7day_forecast(
        station_id=station_id,
        pollutant=pollutant,
        model_code=model_code,
        horizon_days=horizon_days
    )

@router.get("/compare", response_model=MultiModelForecastComparisonResponse, summary="Live Multi-Model Forecast Comparison")
def get_live_compare(
    station_id: str = Query("MH005", description="Monitoring station ID"),
    pollutant: str = Query("PM2.5", description="Target pollutant"),
    horizon_days: int = Query(7, ge=1, le=14, description="Forecast horizon in days")
):
    """
    Returns real-time comparison across ARIMA, Prophet, LSTM, and Baseline for next 7 days.
    """
    return get_live_model_comparison(
        station_id=station_id,
        pollutant=pollutant,
        horizon_days=horizon_days
    )
