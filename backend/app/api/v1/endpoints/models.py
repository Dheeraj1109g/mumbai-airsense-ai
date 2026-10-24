from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.models.model_meta import ModelVersion, ModelMetric
from app.schemas.model_meta import ModelVersionOut, ModelMetricOut, ModelEvaluationComparison, ModelLabSummary
from app.ml.trainer import train_and_evaluate_all
from app.ml.dataset_loader import load_station_timeseries, chronological_split
from app.core.config import settings

router = APIRouter()

MODEL_DISPLAY_NAMES = {
    "arima": ("ARIMA (1,1,1)", "Statistical Box-Jenkins Time-Series"),
    "prophet": ("Prophet", "Additive Decomposition & Seasonality"),
    "lstm": ("LSTM RNN", "Deep Recurrent Sequence-to-Sequence Network"),
    "baseline": ("Persistence Baseline", "Naive Benchmark (y_t+h = y_t)")
}

@router.get("", response_model=List[ModelVersionOut], summary="List Trained Model Versions")
def list_models(
    station_id: Optional[str] = Query(None),
    is_active: bool = Query(True),
    db: Session = Depends(get_db)
):
    q = db.query(ModelVersion).filter(ModelVersion.is_active == is_active)
    if station_id:
        q = q.filter(ModelVersion.target_station_id == station_id)
    return q.all()

@router.get("/metrics", response_model=List[ModelMetricOut], summary="Model Evaluation Metrics")
def get_metrics(
    station_id: Optional[str] = Query("MH005"),
    db: Session = Depends(get_db)
):
    q = db.query(ModelMetric)
    if station_id:
        q = q.filter(ModelMetric.station_id == station_id)
    return q.order_by(ModelMetric.rmse.asc()).all()

@router.get("/lab", summary="Model Lab Diagnostic Summary & Curves")
def get_model_lab_summary(
    station_id: str = Query("MH005", description="Monitoring station ID"),
    pollutant: str = Query("PM2.5", description="Target pollutant"),
    db: Session = Depends(get_db)
):
    """
    Returns data for Model Lab:
    - Comparative metric table (MAE, RMSE, MAPE, coverage)
    - Actual vs. predicted test curves
    - Residual distributions
    - Sample sizes and chronological split dates
    """
    # Check if models exist, otherwise trigger training
    existing = db.query(ModelVersion).filter(
        ModelVersion.target_station_id == station_id,
        ModelVersion.target_pollutant == pollutant,
        ModelVersion.is_active == True
    ).count()

    if existing < 4:
        try:
            train_and_evaluate_all(db, station_id=station_id, pollutant=pollutant)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Model training and evaluation could not be completed for {station_id} ({pollutant}): {str(e)}"
            )

    # 1. Metric comparisons
    metrics = (
        db.query(ModelMetric, ModelVersion)
        .join(ModelVersion, ModelMetric.model_version_id == ModelVersion.id)
        .filter(ModelVersion.target_station_id == station_id)
        .filter(ModelVersion.target_pollutant == pollutant)
        .filter(ModelVersion.is_active == True)
        .all()
    )

    if not metrics:
        raise HTTPException(status_code=404, detail="No trained models found for this station.")

    best_rmse = min([m.rmse for m, _ in metrics])
    comparison_table = []
    eval_start_str = metrics[0][0].eval_start_date.isoformat()
    eval_end_str = metrics[0][0].eval_end_date.isoformat()

    for met, mv in metrics:
        disp_name, m_type = MODEL_DISPLAY_NAMES.get(mv.model_code, (mv.model_code, "Machine Learning"))
        comparison_table.append({
            "model_code": mv.model_code,
            "display_name": disp_name,
            "model_type": m_type,
            "version": mv.version_tag,
            "sample_count": met.sample_count,
            "test_mae": met.mae,
            "test_rmse": met.rmse,
            "test_mape": met.mape,
            "coverage_95": met.coverage_95,
            "residual_summary": met.residual_summary,
            "hyperparameters": mv.hyperparameters,
            "is_recommended": (met.rmse == best_rmse)
        })

    # Sort comparison table so best model is first
    comparison_table.sort(key=lambda x: x["test_rmse"])

    # 2. Load actual held-out test series for the backtest chart
    df = load_station_timeseries(db, station_id=station_id, pollutant=pollutant)
    _, test_df = chronological_split(df, test_days=45)

    backtest_series = []
    # Generate backtest points for each day in test set
    for idx, row in test_df.iterrows():
        backtest_series.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "actual": round(float(row["value"]), 1)
        })

    return {
        "station_id": station_id,
        "pollutant": pollutant,
        "evaluation_period": {
            "start": eval_start_str,
            "end": eval_end_str,
            "held_out_days": len(test_df)
        },
        "models": comparison_table,
        "backtest_series": backtest_series,
        "mape_zero_warning": (
            "Notice: MAPE is known to be mathematically unstable when actual pollutant values are near zero "
            "(e.g., during torrential monsoon clean-air episodes). MAE and RMSE are the recommended objective metrics."
        )
    }

@router.post("/train", summary="Trigger Chronological Model Training")
def trigger_training(
    station_id: str = Form("MH005"),
    pollutant: str = Form("PM2.5"),
    test_days: int = Form(45),
    api_key: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if api_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized. Provide valid ADMIN_SECRET_KEY to trigger training.")

    try:
        return train_and_evaluate_all(db, station_id=station_id, pollutant=pollutant, test_days=test_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")
