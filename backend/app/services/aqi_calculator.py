"""
Official Central Pollution Control Board (CPCB) National Air Quality Index (NAQI) Engine
Ministry of Environment, Forest and Climate Change, Government of India.
"""

from typing import Dict, Optional, Tuple, Any

# CPCB Breakpoint Definitions: (B_lo, B_hi, I_lo, I_hi)
BREAKPOINTS = {
    "PM2.5": [
        (0.0, 30.0, 0, 50),
        (30.1, 60.0, 51, 100),
        (60.1, 90.0, 101, 200),
        (90.1, 120.0, 201, 300),
        (120.1, 250.0, 301, 400),
        (250.1, 500.0, 401, 500),
    ],
    "PM10": [
        (0.0, 50.0, 0, 50),
        (50.1, 100.0, 51, 100),
        (100.1, 250.0, 101, 200),
        (250.1, 350.0, 201, 300),
        (350.1, 430.0, 301, 400),
        (430.1, 600.0, 401, 500),
    ],
    "NO2": [
        (0.0, 40.0, 0, 50),
        (40.1, 80.0, 51, 100),
        (80.1, 180.0, 101, 200),
        (180.1, 280.0, 201, 300),
        (280.1, 400.0, 301, 400),
        (400.1, 600.0, 401, 500),
    ],
    "SO2": [
        (0.0, 40.0, 0, 50),
        (40.1, 80.0, 51, 100),
        (80.1, 380.0, 101, 200),
        (380.1, 800.0, 201, 300),
        (800.1, 1600.0, 301, 400),
        (1600.1, 2400.0, 401, 500),
    ],
    "CO": [
        (0.0, 1.0, 0, 50),
        (1.01, 2.0, 51, 100),
        (2.01, 10.0, 101, 200),
        (10.01, 17.0, 201, 300),
        (17.01, 34.0, 301, 400),
        (34.01, 50.0, 401, 500),
    ],
    "O3": [
        (0.0, 50.0, 0, 50),
        (50.1, 100.0, 51, 100),
        (100.1, 168.0, 101, 200),
        (168.1, 208.0, 201, 300),
        (208.1, 748.0, 301, 400),
        (748.1, 1000.0, 401, 500),
    ],
    "NH3": [
        (0.0, 200.0, 0, 50),
        (200.1, 400.0, 51, 100),
        (400.1, 800.0, 101, 200),
        (800.1, 1200.0, 201, 300),
        (1200.1, 1800.0, 301, 400),
        (1800.1, 2400.0, 401, 500),
    ],
}

AQI_CATEGORIES = [
    (0, 50, "Good", "#10b981", "Minimal impact on health"),
    (51, 100, "Satisfactory", "#84cc16", "Minor breathing discomfort to sensitive people"),
    (101, 200, "Moderate", "#eab308", "Breathing discomfort to people with lung, asthma, and heart diseases"),
    (201, 300, "Poor", "#f97316", "Breathing discomfort to most people on prolonged exposure"),
    (301, 400, "Very Poor", "#ef4444", "Respiratory illness to the people on prolonged exposure"),
    (401, 1000, "Severe", "#7f1d1d", "Affects healthy people and seriously impacts those with existing diseases"),
]

def calculate_sub_index(pollutant: str, concentration: Optional[float]) -> Optional[float]:
    """
    Calculate the linear sub-index for a specific pollutant according to CPCB formulas:
    I = [(I_hi - I_lo) / (B_hi - B_lo)] * (C - B_lo) + I_lo
    """
    if concentration is None or concentration < 0:
        return None

    brackets = BREAKPOINTS.get(pollutant)
    if not brackets:
        return None

    # Check each bracket
    for b_lo, b_hi, i_lo, i_hi in brackets:
        if b_lo <= concentration <= b_hi:
            sub_index = ((i_hi - i_lo) / (b_hi - b_lo)) * (concentration - b_lo) + i_lo
            return round(sub_index, 1)

    # If concentration exceeds highest breakpoint, extrapolate linearly using highest segment slope
    last_b_lo, last_b_hi, last_i_lo, last_i_hi = brackets[-1]
    if concentration > last_b_hi:
        slope = (last_i_hi - last_i_lo) / (last_b_hi - last_b_lo)
        sub_index = slope * (concentration - last_b_hi) + last_i_hi
        return round(min(sub_index, 500.0), 1)

    return None

def get_aqi_category(aqi_value: Optional[float]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Returns (category_name, hex_color, health_advisory) for a given AQI score.
    """
    if aqi_value is None:
        return None, None, None

    val = round(aqi_value)
    for lower, upper, cat, color, advisory in AQI_CATEGORIES:
        if lower <= val <= upper:
            return cat, color, advisory

    if val > 500:
        return "Severe", "#7f1d1d", "Affects healthy people and seriously impacts those with existing diseases"
    return "Unknown", "#94a3b8", "No advisory available"

def calculate_overall_aqi(pollutant_concentrations: Dict[str, Optional[float]]) -> Dict[str, Any]:
    """
    Computes overall CPCB AQI from a dictionary of pollutant readings:
    - Minimum 3 valid pollutants required
    - At least one must be PM2.5 or PM10
    - AQI = max(sub_indices)
    - Prominent pollutant = argmax(sub_indices)
    """
    sub_indices: Dict[str, float] = {}

    for pol, conc in pollutant_concentrations.items():
        if conc is not None and pol in BREAKPOINTS:
            idx = calculate_sub_index(pol, conc)
            if idx is not None:
                sub_indices[pol] = idx

    has_pm = ("PM2.5" in sub_indices) or ("PM10" in sub_indices)
    is_valid_cpcb_aqi = (len(sub_indices) >= 3) and has_pm

    if not sub_indices:
        return {
            "aqi": None,
            "category": None,
            "color": None,
            "advisory": None,
            "prominent_pollutant": None,
            "sub_indices": {},
            "is_valid_cpcb": False,
            "rule_explanation": "Insufficient pollutant measurements available to compute sub-indices."
        }

    # Best-effort calculated AQI is max of available sub-indices
    max_pol = max(sub_indices, key=sub_indices.get)
    max_aqi = sub_indices[max_pol]
    cat, color, advisory = get_aqi_category(max_aqi)

    rule_explanation = (
        "Compliant with official CPCB NAQI standard: >= 3 pollutants including PM2.5 or PM10."
        if is_valid_cpcb_aqi else
        "Note: Partial calculation based on available sub-indices; does not satisfy CPCB 3-pollutant NAQI completeness rule."
    )

    return {
        "aqi": max_aqi,
        "category": cat,
        "color": color,
        "advisory": advisory,
        "prominent_pollutant": max_pol,
        "sub_indices": sub_indices,
        "is_valid_cpcb": is_valid_cpcb_aqi,
        "rule_explanation": rule_explanation
    }
