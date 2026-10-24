from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class ModelVersionOut(BaseModel):
    id: int
    model_code: str
    version_tag: str
    target_pollutant: str
    target_station_id: Optional[str] = None
    hyperparameters: Optional[Dict[str, Any]] = None
    is_active: bool
    trained_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class ModelMetricOut(BaseModel):
    id: int
    model_version_id: int
    split_type: str
    eval_start_date: date
    eval_end_date: date
    sample_count: int
    mae: float
    rmse: float
    mape: Optional[float] = None
    coverage_95: Optional[float] = None
    station_id: Optional[str] = None
    residual_summary: Optional[Dict[str, Any]] = None
    model_config = ConfigDict(from_attributes=True)

class ModelEvaluationComparison(BaseModel):
    model_code: str
    display_name: str
    model_type: str
    version: str
    sample_count: int
    test_mae: float
    test_rmse: float
    test_mape: Optional[float]
    coverage_95: Optional[float]
    training_time_seconds: float
    hyperparameters_summary: str
    is_recommended: bool

class BacktestPlotPoint(BaseModel):
    date: str
    actual: float
    predicted_arima: Optional[float] = None
    predicted_prophet: Optional[float] = None
    predicted_lstm: Optional[float] = None
    predicted_baseline: Optional[float] = None

class ModelLabSummary(BaseModel):
    evaluation_period: Dict[str, str]
    models: List[ModelEvaluationComparison]
    backtest_series: List[BacktestPlotPoint]
    mape_zero_warning: str
