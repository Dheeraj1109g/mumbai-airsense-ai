from fastapi import APIRouter
from app.api.v1.endpoints import health, stations, observations, sources, forecast, models, analysis, live, auth

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health & Status"])
api_router.include_router(auth.router, prefix="/auth", tags=["Citizen Authentication & Preferences"])
api_router.include_router(live.router, prefix="/live", tags=["Live Real-Time Telemetry"])
api_router.include_router(stations.router, prefix="/stations", tags=["Monitoring Stations"])
api_router.include_router(observations.router, prefix="/observations", tags=["Observations & AQI"])
api_router.include_router(forecast.router, prefix="/forecast", tags=["7-Day Forecasting"])
api_router.include_router(models.router, prefix="/models", tags=["Model Lab & Metrics"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Fairness, Bias & Health Guidance"])
api_router.include_router(sources.router, prefix="/data", tags=["Data Sources & Management"])
