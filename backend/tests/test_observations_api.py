import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_latest_observations_summary():
    response = client.get("/api/v1/observations/latest")
    assert response.status_code == 200
    data = response.json()
    assert "mumbai_aqi" in data
    assert "mumbai_bucket" in data
    assert "observation_date" in data
    assert data["active_stations_reporting"] > 0
    assert data["total_stations"] >= 10
    assert "most_polluted_station" in data
    assert "least_polluted_station" in data

def test_historical_observations_pagination():
    response = client.get("/api/v1/observations/history?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 1000
    assert len(data["items"]) == 10
    assert data["page"] == 1

def test_historical_observations_station_filter():
    response = client.get("/api/v1/observations/history?station_id=MH005&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 500
    for item in data["items"]:
        assert item["station_id"] == "MH005"

def test_map_stations_endpoint():
    response = client.get("/api/v1/observations/map")
    assert response.status_code == 200
    stations = response.json()
    assert len(stations) >= 10
    # Check that verified coordinates are present and valid
    for stn in stations:
        assert 18.5 <= stn["latitude"] <= 19.5
        assert 72.5 <= stn["longitude"] <= 73.5
        assert stn["station_id"] != "MUMBAI_CITY"  # Physical map markers only

def test_data_sources_endpoint():
    response = client.get("/api/v1/data/sources")
    assert response.status_code == 200
    sources = response.json()
    assert len(sources) >= 4
    source_ids = [s["source_id"] for s in sources]
    assert "cpcb-caaqms" in source_ids
    assert "mpcb-network" in source_ids
