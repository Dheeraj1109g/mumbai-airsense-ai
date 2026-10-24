"""
ARIMA Time-Series Forecaster (Statsmodels).
Provides the statistical autoregressive integrated moving average baseline.
Generates model-based statistical prediction intervals.
"""

from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
import warnings

class ArimaForecaster:
    def __init__(self, order: Tuple[int, int, int] = (1, 1, 1)):
        self.order = order
        self.model_code: str = "arima"
        self.version_tag: str = f"v1.0-ARIMA{order}"
        self.fitted_model = None
        self.last_train_data = None

    def fit(self, train_series: np.ndarray):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            train_series = np.asarray(train_series, dtype=float)
            self.last_train_data = train_series
            # Fit ARIMA model
            model = ARIMA(train_series, order=self.order)
            self.fitted_model = model.fit()

    def predict(self, horizon: int = 7) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        if not self.fitted_model:
            raise ValueError("ARIMA model must be fitted prior to running predictions.")
        
        forecast_res = self.fitted_model.get_forecast(steps=horizon)
        preds = np.maximum(0.0, forecast_res.predicted_mean)
        conf_int = forecast_res.conf_int(alpha=0.05)
        
        lower = np.maximum(0.0, conf_int[:, 0])
        upper = np.maximum(preds, conf_int[:, 1])
        return np.asarray(preds), np.asarray(lower), np.asarray(upper)
