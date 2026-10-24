"""
Model Trainer and Backtesting Orchestrator.
Trains Baseline, ARIMA, Prophet, and LSTM models on chronological splits,
computes held-out test metrics, serializes model artifacts, and records DB metrics.
"""

import os
import time
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.model_meta import ModelVersion, ModelMetric
from app.ml.dataset_loader import load_station_timeseries, chronological_split
from app.ml.models.baseline import BaselineForecaster
from app.ml.models.arima_model import ArimaForecaster
from app.ml.models.prophet_model import ProphetForecaster
from app.ml.models.lstm_model import LSTMForecaster
from app.ml.evaluator import compute_metrics

logger = logging.getLogger(__name__)

def train_and_evaluate_all(
    db: Session,
    station_id: str = "MH005",
    pollutant: str = "PM2.5",
    test_days: int = 45
) -> Dict[str, Any]:
    """
    Executes end-to-end training and comparative backtesting across all 4 models.
    """
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    df = load_station_timeseries(db, station_id=station_id, pollutant=pollutant)
    train_df, test_df = chronological_split(df, test_days=test_days)

    y_train = train_df["value"].values
    y_test = test_df["value"].values
    eval_start = test_df["date"].min().date()
    eval_end = test_df["date"].max().date()

    logger.info(f"Training on {len(train_df)} days, Testing on {len(test_df)} days ({eval_start} to {eval_end})")

    results = {}
    models_to_train = [
        ("baseline", BaselineForecaster(), {"method": "persistence"}),
        ("arima", ArimaForecaster(order=(1, 1, 1)), {"order": (1, 1, 1)}),
        ("prophet", ProphetForecaster(), {"interval_width": 0.95, "weekly_seasonality": True}),
        ("lstm", LSTMForecaster(seq_length=14, horizon=7), {"seq_len": 14, "hidden_dim": 32, "epochs": 35}),
    ]

    for model_code, model_obj, hyperparams in models_to_train:
        t0 = time.time()
        logger.info(f"Training {model_code}...")

        # 1. Fit model on training data only
        if model_code == "prophet":
            model_obj.fit(train_df)
        elif model_code == "lstm":
            model_obj.fit(y_train, epochs=35)
        else:
            model_obj.fit(y_train)

        elapsed = time.time() - t0

        # 2. Backtest rolling evaluation on test period (simulate multi-step 7-day windows)
        preds_all, lower_all, upper_all = [], [], []
        # Multi-step forecasting over the test horizon
        h = len(y_test)
        if model_code == "baseline":
            p, l, u = model_obj.predict(horizon=h, last_value=y_train[-1])
        elif model_code == "arima":
            p, l, u = model_obj.predict(horizon=h)
        elif model_code == "prophet":
            p, l, u = model_obj.predict(horizon=h)
        elif model_code == "lstm":
            # Pass last training sequence window
            p, l, u = model_obj.predict(horizon=min(7, h))
            # Pad to full test length if needed
            if len(p) < h:
                p = np.pad(p, (0, h - len(p)), mode="edge")
                l = np.pad(l, (0, h - len(l)), mode="edge")
                u = np.pad(u, (0, h - len(u)), mode="edge")

        metrics = compute_metrics(y_test, p, l, u)
        metrics["training_time_seconds"] = round(elapsed, 2)

        # 3. Save model artifact
        artifact_path = os.path.join(settings.MODEL_DIR, f"{model_code}_{station_id}_{pollutant.lower().replace('.', '')}.joblib")
        joblib.dump(model_obj, artifact_path)

        # 4. Save to Database
        # Deactivate old versions
        db.query(ModelVersion).filter(
            ModelVersion.model_code == model_code,
            ModelVersion.target_station_id == station_id,
            ModelVersion.target_pollutant == pollutant
        ).update({"is_active": False})

        mv = ModelVersion(
            model_code=model_code,
            version_tag=model_obj.version_tag,
            target_pollutant=pollutant,
            target_station_id=station_id,
            hyperparameters=hyperparams,
            artifact_path=artifact_path,
            is_active=True
        )
        db.add(mv)
        db.commit()
        db.refresh(mv)

        mm = ModelMetric(
            model_version_id=mv.id,
            split_type="test",
            eval_start_date=eval_start,
            eval_end_date=eval_end,
            sample_count=len(y_test),
            mae=metrics["mae"],
            rmse=metrics["rmse"],
            mape=metrics["mape"],
            coverage_95=metrics["coverage_95"],
            station_id=station_id,
            residual_summary=metrics["residual_summary"]
        )
        db.add(mm)
        db.commit()

        results[model_code] = {
            "version_id": mv.id,
            "version_tag": mv.version_tag,
            "metrics": metrics,
            "artifact_path": artifact_path,
            "predictions_sample": [round(float(x), 1) for x in p[:7]]
        }

    # Identify best model based on held-out RMSE
    best_code = min(results.keys(), key=lambda k: results[k]["metrics"]["rmse"])

    summary = {
        "station_id": station_id,
        "pollutant": pollutant,
        "test_period": {"start": eval_start.isoformat(), "end": eval_end.isoformat(), "days": len(y_test)},
        "best_model_by_rmse": best_code,
        "comparison": results,
        "mape_unsuitability_note": (
            "Notice: MAPE is provided for standard convention, but can be mathematically fragile when actual pollutant "
            "concentrations approach near-zero (e.g. during heavy monsoon downpours). MAE and RMSE represent the primary evaluation metrics."
        )
    }

    # Save benchmark report to reports directory
    rep_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "reports", "model_benchmark_results.json"))
    with open(rep_path, "w") as f:
        json.dump(summary, f, indent=2)

    return summary
