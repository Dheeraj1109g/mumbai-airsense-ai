import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_live_summary_endpoint():
    response = client.get("/api/v1/live/summary")
    assert response.status_code == 200
    data = response.json()
    assert "mumbai_aqi" in data
    assert "mumbai_bucket" in data
    assert data["data_provenance"] == "live_telemetry_feed"
    assert data["active_stations_reporting"] > 0

def test_live_map_endpoint():
    response = client.get("/api/v1/live/map")
    assert response.status_code == 200
    stations = response.json()
    assert len(stations) >= 10
    # Every station should have live AQI and coordinates
    for stn in stations:
        assert stn["latest_aqi"] is not None
        assert stn["data_freshness_status"] == "available"

def test_live_forecast_endpoint():
    response = client.get("/api/v1/live/forecast?station_id=MH005&pollutant=PM2.5&horizon_days=7")
    assert response.status_code == 200
    data = response.json()
    assert len(data["forecast_points"]) == 7
    assert data["forecast_points"][0]["predicted_value"] > 0
    assert "Live" in data["model_version"]
