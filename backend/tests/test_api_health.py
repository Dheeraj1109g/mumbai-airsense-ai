import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Mumbai" in data["city"]

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert data["database_status"] == "healthy"
    assert "active_stations_count" in data
    assert "total_observations_count" in data

def test_stations_endpoint():
    response = client.get("/api/v1/stations")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
