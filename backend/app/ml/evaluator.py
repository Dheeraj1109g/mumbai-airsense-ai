"""
Evaluation Engine for Time-Series Forecasting Models.
Computes MAE, RMSE, MAPE (with small-denominator guards), 95% interval coverage,
and residual distribution diagnostics.
"""

from typing import Dict, Any, Optional
import numpy as np
from scipy import stats

def compute_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_lower: Optional[np.ndarray] = None,
    y_upper: Optional[np.ndarray] = None
) -> Dict[str, Any]:
    """
    Computes rigorous error metrics on held-out test predictions.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    # Clean any NaN values
    mask = ~np.isnan(y_true) & ~np.isnan(y_pred)
    y_true = y_true[mask]
    y_pred = y_pred[mask]

    if len(y_true) == 0:
        return {"mae": 0.0, "rmse": 0.0, "mape": None, "coverage_95": None, "sample_count": 0}

    errors = y_true - y_pred
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(errors ** 2)))

    # MAPE calculation with zero-value / low-value guard
    # Standard MAPE blows up towards infinity when actual values approach 0.
    non_zero_mask = y_true > 1.0
    if np.sum(non_zero_mask) > 0:
        mape = float(np.mean(np.abs(errors[non_zero_mask] / y_true[non_zero_mask])) * 100)
    else:
        mape = None

    # Empirical 95% prediction interval coverage
    coverage_95 = None
    if y_lower is not None and y_upper is not None:
        y_lower = np.asarray(y_lower, dtype=float)[mask]
        y_upper = np.asarray(y_upper, dtype=float)[mask]
        within_bounds = (y_true >= y_lower) & (y_true <= y_upper)
        coverage_95 = float(np.mean(within_bounds) * 100)

    # Residual distribution statistics
    res_mean = float(np.mean(errors))
    res_std = float(np.std(errors))
    res_skew = float(stats.skew(errors)) if len(errors) >= 8 else 0.0

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "mape": round(mape, 2) if mape is not None else None,
        "coverage_95": round(coverage_95, 2) if coverage_95 is not None else None,
        "sample_count": len(y_true),
        "residual_summary": {
            "mean": round(res_mean, 2),
            "std": round(res_std, 2),
            "skewness": round(res_skew, 2),
            "underprediction_rate": round(float(np.mean(errors > 0) * 100), 1),
            "overprediction_rate": round(float(np.mean(errors < 0) * 100), 1)
        }
    }
