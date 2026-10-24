"""
Persistence Baseline Forecaster.
Establishes the naive benchmark: y_{t+h} = y_t.
Prediction intervals are calibrated using the historical standard deviation of differences.
"""

from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd

class BaselineForecaster:
    def __init__(self):
        self.last_observed: float = 0.0
        self.residual_std: float = 10.0
        self.model_code: str = "baseline"
        self.version_tag: str = "v1.0"

    def fit(self, train_series: np.ndarray):
        train_series = np.asarray(train_series, dtype=float)
        self.last_observed = float(train_series[-1])
        # Empirical residual standard error from 1-day differences
        diffs = np.diff(train_series)
        self.residual_std = float(np.std(diffs)) if len(diffs) > 1 else 10.0

    def predict(self, horizon: int = 7, last_value: float = None) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        base_val = last_value if last_value is not None else self.last_observed
        # Naive forecast repeats the last observed measurement
        preds = np.full(horizon, max(0.0, base_val))
        # Interval expands with horizon sqrt(h)
        multipliers = np.sqrt(np.arange(1, horizon + 1))
        half_widths = 1.96 * self.residual_std * multipliers * 0.4
        lower = np.maximum(0.0, preds - half_widths)
        upper = preds + half_widths
        return preds, lower, upper
