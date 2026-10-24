import pytest
from app.services.aqi_calculator import (
    calculate_sub_index,
    get_aqi_category,
    calculate_overall_aqi,
    BREAKPOINTS
)

def test_pm25_sub_index():
    # Good bracket: 0 - 30 -> 0 - 50
    assert calculate_sub_index("PM2.5", 15.0) == 25.0
    
    # Satisfactory bracket: 30.1 - 60 -> 51 - 100
    idx = calculate_sub_index("PM2.5", 45.0)
    assert 74.0 <= idx <= 76.0
    
    # Poor bracket: 90.1 - 120 -> 201 - 300
    idx_poor = calculate_sub_index("PM2.5", 105.0)
    assert 240.0 <= idx_poor <= 260.0

def test_pm10_sub_index():
    # Moderate bracket: 100.1 - 250 -> 101 - 200
    idx = calculate_sub_index("PM10", 175.0)
    assert 145.0 <= idx <= 155.0

def test_aqi_categories():
    assert get_aqi_category(35)[0] == "Good"
    assert get_aqi_category(75)[0] == "Satisfactory"
    assert get_aqi_category(150)[0] == "Moderate"
    assert get_aqi_category(250)[0] == "Poor"
    assert get_aqi_category(350)[0] == "Very Poor"
    assert get_aqi_category(450)[0] == "Severe"

def test_overall_aqi_cpcb_rule():
    # Compliant: 3 pollutants with PM
    readings = {
        "PM2.5": 45.0,  # ~75
        "PM10": 180.0,  # ~153 (Moderate)
        "NO2": 35.0,    # ~43 (Good)
    }
    result = calculate_overall_aqi(readings)
    assert result["is_valid_cpcb"] is True
    assert result["prominent_pollutant"] == "PM10"
    assert result["category"] == "Moderate"
    assert 150 <= result["aqi"] <= 156

def test_insufficient_pollutants_cpcb_flag():
    # Only 1 pollutant: Still calculates best-effort, but flags is_valid_cpcb = False
    readings = {"PM2.5": 85.0}
    result = calculate_overall_aqi(readings)
    assert result["is_valid_cpcb"] is False
    assert result["category"] == "Moderate"
    assert "Note: Partial calculation" in result["rule_explanation"]
