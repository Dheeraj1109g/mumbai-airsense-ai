"""
Prophet Forecasting Model (Facebook / Meta).
Captures trend changes and weekly/yearly seasonality.
Generates Bayesian posterior uncertainty intervals (yhat_lower, yhat_upper).
"""

from typing import Dict, Any, Tuple
import logging
import numpy as np
import pandas as pd
from prophet import Prophet
import warnings

# Suppress cmdstanpy verbose logs
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)

class ProphetForecaster:
    def __init__(self):
        self.model_code: str = "prophet"
        self.version_tag: str = "v1.0-Prophet"
        self.fitted_model: Prophet = None

    def fit(self, train_df: pd.DataFrame):
        """
        train_df must contain 'date' and 'value' columns.
        """
        prophet_df = pd.DataFrame({
            "ds": pd.to_datetime(train_df["date"]),
            "y": train_df["value"].astype(float)
        })

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            # Disable yearly seasonality if data duration is short
            duration_days = (prophet_df["ds"].max() - prophet_df["ds"].min()).days
            has_yearly = duration_days > 365

            m = Prophet(
                interval_width=0.95,
                daily_seasonality=False,
                weekly_seasonality=True,
                yearly_seasonality=has_yearly,
                changepoint_prior_scale=0.05
            )
            m.fit(prophet_df)
            self.fitted_model = m

    def predict(self, horizon: int = 7) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        if not self.fitted_model:
            raise ValueError("Prophet model must be fitted prior to running predictions.")

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            future = self.fitted_model.make_future_dataframe(periods=horizon, freq="D")
            forecast = self.fitted_model.predict(future)

            tail = forecast.iloc[-horizon:]
            preds = np.maximum(0.0, tail["yhat"].values)
            lower = np.maximum(0.0, tail["yhat_lower"].values)
            upper = np.maximum(preds, tail["yhat_upper"].values)

            return preds, lower, upper
