from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field

class ForecastRequest(BaseModel):
    station_id: str = Field(default="MH005", description="Station ID or 'MUMBAI_CITY' for city-wide aggregation")
    pollutant: str = Field(default="PM2.5", description="Target pollutant: PM2.5 | PM10 | NO2")
    model_code: str = Field(default="arima", description="Forecasting model: arima | prophet | lstm | baseline")
    horizon_days: int = Field(default=7, ge=1, le=14, description="Forecast horizon in days")

class ForecastValueItem(BaseModel):
    forecast_date: str
    predicted_value: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    calculated_predicted_aqi: Optional[float] = None
    predicted_aqi_bucket: Optional[str] = None

class ForecastResponse(BaseModel):
    station_id: str
    station_name: str
    pollutant: str
    unit: str
    model_code: str
    model_version: str
    generated_at: str
    horizon_days: int
    interval_type: str  # "model_statistical_interval" | "calibrated_residual_interval"
    confidence_level: float = 0.95
    forecast_disclaimer: str = (
        "Notice: Air quality forecasts are statistical and neural estimates derived from historical CAAQMS time-series data. "
        "Atmospheric inversions, unexpected industrial events, or sudden meteorological anomalies may cause deviations."
    )
    historical_context: List[Dict[str, Any]] = []  # last 7-14 days of real observations
    forecast_points: List[ForecastValueItem] = []

class ModelComparisonItem(BaseModel):
    model_code: str
    model_name: str
    forecast_points: List[ForecastValueItem]
    test_mae: Optional[float] = None
    test_rmse: Optional[float] = None
    test_mape: Optional[float] = None
    best_model: bool = False

class MultiModelForecastComparisonResponse(BaseModel):
    station_id: str
    pollutant: str
    horizon_days: int
    generated_at: str
    models: List[ModelComparisonItem]
    recommendation_rationale: str
