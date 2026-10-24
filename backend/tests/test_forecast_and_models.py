import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_guidance_endpoint():
    response = client.get("/api/v1/analysis/health")
    assert response.status_code == 200
    guidance = response.json()
    assert len(guidance) == 6
    categories = [g["category"] for g in guidance]
    assert "Good" in categories
    assert "Severe" in categories
    assert "Very Poor" in categories

def test_fairness_analysis_endpoint():
    response = client.get("/api/v1/analysis/fairness")
    assert response.status_code == 200
    data = response.json()
    assert "stations_coverage" in data
    assert len(data["stations_coverage"]) >= 10
    assert "academic_report" in data
    assert len(data["academic_report"]["key_findings"]) >= 3

def test_forecast_generation_baseline():
    payload = {
        "station_id": "MH005",
        "pollutant": "PM2.5",
        "model_code": "baseline",
        "horizon_days": 7
    }
    response = client.post("/api/v1/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["station_id"] == "MH005"
    assert len(data["forecast_points"]) == 7
    assert data["forecast_points"][0]["calculated_predicted_aqi"] is not None
    assert "confidence_level" in data
    assert "forecast_disclaimer" in data

def test_forecast_compare_endpoint():
    response = client.get("/api/v1/forecast/compare?station_id=MH005&pollutant=PM2.5&horizon_days=7")
    assert response.status_code == 200
    data = response.json()
    assert len(data["models"]) >= 4
    codes = [m["model_code"] for m in data["models"]]
    assert "arima" in codes
    assert "prophet" in codes
    assert "lstm" in codes
    assert "baseline" in codes

def test_model_lab_summary():
    response = client.get("/api/v1/models/lab?station_id=MH005&pollutant=PM2.5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["models"]) == 4
    assert len(data["backtest_series"]) > 0
    assert "evaluation_period" in data
    assert "mape_zero_warning" in data
