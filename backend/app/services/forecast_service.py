"""
Forecasting Service for Mumbai AirSense AI.
Generates multi-day pollutant forecasts with uncertainty intervals, derives official CPCB AQI,
persists forecast runs in the database, and provides multi-model comparative analyses.
"""

import os
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.config import settings
from app.models.station import MonitoringStation
from app.models.observation import Observation
from app.models.model_meta import ModelVersion, ModelMetric
from app.models.forecast import ForecastRun, ForecastValue
from app.services.aqi_calculator import calculate_sub_index, get_aqi_category
from app.ml.trainer import train_and_evaluate_all
from app.ml.dataset_loader import load_station_timeseries

def get_or_train_model(db: Session, station_id: str, pollutant: str, model_code: str):
    """
    Retrieves the active model artifact or triggers training if no artifact exists.
    """
    mv = (
        db.query(ModelVersion)
        .filter(
            ModelVersion.model_code == model_code,
            ModelVersion.target_station_id == station_id,
            ModelVersion.target_pollutant == pollutant,
            ModelVersion.is_active == True
        )
        .first()
    )

    if mv and mv.artifact_path and os.path.exists(mv.artifact_path):
        model_obj = joblib.load(mv.artifact_path)
        return mv, model_obj

    # Trigger training if not yet trained
    train_summary = train_and_evaluate_all(db, station_id=station_id, pollutant=pollutant)
    mv = (
        db.query(ModelVersion)
        .filter(
            ModelVersion.model_code == model_code,
            ModelVersion.target_station_id == station_id,
            ModelVersion.target_pollutant == pollutant,
            ModelVersion.is_active == True
        )
        .first()
    )
    model_obj = joblib.load(mv.artifact_path)
    return mv, model_obj

def generate_forecast(
    db: Session,
    station_id: str = "MH005",
    pollutant: str = "PM2.5",
    model_code: str = "arima",
    horizon_days: int = 7
) -> Dict[str, Any]:
    """
    Executes forecast generation for the requested horizon, calculates predicted AQI,
    stores records in database, and returns the payload.
    """
    stn = db.query(MonitoringStation).filter(MonitoringStation.station_id == station_id).first()
    station_name = stn.station_name if stn else station_id

    # 1. Load historical context
    df = load_station_timeseries(db, station_id=station_id, pollutant=pollutant)
    last_date = df["date"].max().date()
    historical_tail = df.iloc[-14:].copy()
    hist_context = []
    for _, r in historical_tail.iterrows():
        hist_context.append({
            "date": r["date"].strftime("%Y-%m-%d"),
            "value": round(float(r["value"]), 1)
        })

    # 2. Retrieve model & generate predictions
    mv, model_obj = get_or_train_model(db, station_id, pollutant, model_code)

    if model_code == "baseline":
        preds, lower, upper = model_obj.predict(horizon=horizon_days, last_value=df["value"].iloc[-1])
    elif model_code == "lstm":
        preds, lower, upper = model_obj.predict(horizon=horizon_days, input_window=df["value"].iloc[-14:].values)
    else:
        preds, lower, upper = model_obj.predict(horizon=horizon_days)

    preds = preds[:horizon_days]
    lower = lower[:horizon_days]
    upper = upper[:horizon_days]

    # 3. Derive future dates and calculate predicted AQI
    forecast_points = []
    db_values = []

    # Create ForecastRun in DB
    frun = ForecastRun(
        model_version_id=mv.id,
        station_id=station_id,
        target_pollutant=pollutant,
        horizon_days=horizon_days,
        forecast_type="daily"
    )
    db.add(frun)
    db.commit()
    db.refresh(frun)

    for h in range(horizon_days):
        f_date = last_date + timedelta(days=h + 1)
        p_val = max(0.0, round(float(preds[h]), 1))
        l_val = max(0.0, round(float(lower[h]), 1))
        u_val = max(p_val, round(float(upper[h]), 1))

        # Derive predicted AQI from predicted pollutant concentration via official CPCB breakpoints
        pred_aqi = calculate_sub_index(pollutant, p_val)
        pred_cat, _, _ = get_aqi_category(pred_aqi)

        item = {
            "forecast_date": f_date.strftime("%Y-%m-%d"),
            "predicted_value": p_val,
            "lower_bound": l_val,
            "upper_bound": u_val,
            "calculated_predicted_aqi": pred_aqi,
            "predicted_aqi_bucket": pred_cat
        }
        forecast_points.append(item)

        db_values.append(ForecastValue(
            forecast_run_id=frun.id,
            forecast_date=f_date,
            predicted_pollutant_value=p_val,
            lower_bound=l_val,
            upper_bound=u_val,
            calculated_predicted_aqi=pred_aqi,
            predicted_aqi_bucket=pred_cat
        ))

    db.bulk_save_objects(db_values)
    db.commit()

    interval_type = (
        "Bayesian Monte Carlo posterior interval (95%)" if model_code == "prophet" else
        "Statistical ARIMA confidence interval (95%)" if model_code == "arima" else
        "Empirical residual-calibrated prediction interval (95%)"
    )

    return {
        "station_id": station_id,
        "station_name": station_name,
        "pollutant": pollutant,
        "unit": "ug/m3" if pollutant != "CO" else "mg/m3",
        "model_code": model_code,
        "model_version": mv.version_tag,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "horizon_days": horizon_days,
        "interval_type": interval_type,
        "confidence_level": 0.95,
        "forecast_disclaimer": (
            "Notice: Air quality forecasts are statistical and neural estimates derived from historical CAAQMS time-series data. "
            "Atmospheric inversions, unexpected industrial events, or sudden meteorological anomalies may cause deviations."
        ),
        "historical_context": hist_context,
        "forecast_points": forecast_points
    }

def compare_all_models(
    db: Session,
    station_id: str = "MH005",
    pollutant: str = "PM2.5",
    horizon_days: int = 7
) -> Dict[str, Any]:
    """
    Generates side-by-side forecasts for ARIMA, Prophet, LSTM, and Baseline.
    """
    model_codes = ["arima", "prophet", "lstm", "baseline"]
    display_names = {
        "arima": "ARIMA (Autoregressive Integrated Moving Average)",
        "prophet": "Prophet (Additive Trend & Seasonality)",
        "lstm": "LSTM (Recurrent Neural Network)",
        "baseline": "Persistence Baseline (Naive Benchmark)"
    }

    # Fetch held-out test metrics for each model
    metrics_map = {}
    for code in model_codes:
        mv = (
            db.query(ModelVersion)
            .filter(
                ModelVersion.model_code == code,
                ModelVersion.target_station_id == station_id,
                ModelVersion.target_pollutant == pollutant,
                ModelVersion.is_active == True
            )
            .first()
        )
        if mv:
            metric = db.query(ModelMetric).filter(ModelMetric.model_version_id == mv.id).first()
            if metric:
                metrics_map[code] = {"mae": metric.mae, "rmse": metric.rmse, "mape": metric.mape}

    # Find best model
    best_code = min(metrics_map.keys(), key=lambda k: metrics_map[k]["rmse"]) if metrics_map else "arima"

    compared_items = []
    for code in model_codes:
        fc = generate_forecast(db, station_id=station_id, pollutant=pollutant, model_code=code, horizon_days=horizon_days)
        met = metrics_map.get(code, {})
        compared_items.append({
            "model_code": code,
            "model_name": display_names.get(code, code),
            "forecast_points": fc["forecast_points"],
            "test_mae": met.get("mae"),
            "test_rmse": met.get("rmse"),
            "test_mape": met.get("mape"),
            "best_model": (code == best_code)
        })

    return {
        "station_id": station_id,
        "pollutant": pollutant,
        "horizon_days": horizon_days,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "models": compared_items,
        "recommendation_rationale": (
            f"Model '{best_code.upper()}' achieved the lowest held-out test RMSE on chronological verification. "
            "Selection is strictly grounded in empirical validation on unseen test data rather than model complexity."
        )
    }
