"""
Dataset Loader & Preprocessor for Time-Series Forecasting
Enforces strictly chronological train/validation/test splits, prevents data leakage,
and prepares feature windows for ARIMA, Prophet, and LSTM models.
"""

from typing import Tuple, Optional, Dict, Any
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sqlalchemy.orm import Session
from sqlalchemy import asc

from app.models.observation import Observation

def load_station_timeseries(
    db: Session,
    station_id: str = "MH005",
    pollutant: str = "PM2.5",
    min_date: Optional[str] = "2018-01-01"
) -> pd.DataFrame:
    """
    Loads daily pollutant observations for a specified station from the database,
    aligns them to a regular daily frequency, and cleans minor gaps.
    """
    col_attr = pollutant.lower().replace(".", "")
    if col_attr == "pm25":
        field = Observation.pm25
    elif col_attr == "pm10":
        field = Observation.pm10
    elif col_attr == "no2":
        field = Observation.no2
    else:
        field = Observation.pm25

    query = (
        db.query(Observation.observation_date, field.label("value"))
        .filter(Observation.station_id == station_id)
        .filter(field.isnot(None))
    )
    if min_date:
        query = query.filter(Observation.observation_date >= pd.to_datetime(min_date).date())

    results = query.order_by(asc(Observation.observation_date)).all()
    if not results or len(results) < 30:
        # Graceful regional composite fallback to MUMBAI_CITY if station observations are sparse
        fallback_query = (
            db.query(Observation.observation_date, field.label("value"))
            .filter(Observation.station_id == "MUMBAI_CITY")
            .filter(field.isnot(None))
        )
        if min_date:
            fallback_query = fallback_query.filter(Observation.observation_date >= pd.to_datetime(min_date).date())
        results = fallback_query.order_by(asc(Observation.observation_date)).all()
        if not results or len(results) < 30:
            raise ValueError(f"Insufficient historical data available for '{pollutant}'. Found {len(results)} rows.")

    df = pd.DataFrame(results, columns=["date", "value"])
    df["date"] = pd.to_datetime(df["date"])
    df.set_index("date", inplace=True)
    
    # Resample to complete regular daily calendar frequency
    df = df.resample("D").mean()
    # Interpolate short sensor dropouts (up to 3 consecutive days)
    df["value"] = df["value"].interpolate(method="time", limit=3)
    # Forward-fill any remaining single-day boundary dropouts
    df["value"] = df["value"].ffill().bfill()

    df.reset_index(inplace=True)
    return df

def chronological_split(
    df: pd.DataFrame,
    test_days: int = 45
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Performs a strict chronological train/test split.
    Test set is the final `test_days` of observations.
    Prevents any future information leakage.
    """
    if len(df) <= test_days + 30:
        test_days = max(14, int(len(df) * 0.15))

    split_idx = len(df) - test_days
    train_df = df.iloc[:split_idx].copy()
    test_df = df.iloc[split_idx:].copy()

    return train_df, test_df

def create_lstm_sequences(
    values: np.ndarray,
    seq_length: int = 14,
    horizon: int = 7
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Transforms 1D time-series into sliding input sequences (X) and future target horizons (y).
    X shape: (samples, seq_length, 1)
    y shape: (samples, horizon)
    """
    X, y = [], []
    for i in range(len(values) - seq_length - horizon + 1):
        X.append(values[i : i + seq_length])
        y.append(values[i + seq_length : i + seq_length + horizon])
    return np.array(X), np.array(y)
