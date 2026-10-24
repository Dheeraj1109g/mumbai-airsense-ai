from typing import List, Optional, Dict, Any
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.session import get_db
from app.models.observation import Observation
from app.models.station import MonitoringStation
from app.schemas.observation import ObservationOut, LatestAQISummary
from app.schemas.station import StationMapItem
from app.schemas.common import PaginatedResponse
from app.services.aqi_calculator import get_aqi_category

router = APIRouter()

@router.get("/latest", response_model=LatestAQISummary, summary="Mumbai Latest AQI Overview")
def get_latest_aqi_summary(
    station_id: Optional[str] = Query(None, description="Optional station ID filter; defaults to Mumbai City-wide composite"),
    db: Session = Depends(get_db)
):
    """
    Returns the latest available AQI overview for Mumbai:
    - Overall AQI & Category
    - Observation date and provenance
    - Active stations reporting
    - Most and least polluted stations
    - City-wide prominent pollutant and distribution
    """
    # 1. Determine target station or composite
    target_id = station_id if station_id else "MUMBAI_CITY"
    latest_record = (
        db.query(Observation)
        .filter(Observation.station_id == target_id)
        .order_by(desc(Observation.observation_date))
        .first()
    )

    if not latest_record:
        # Fallback to the latest record across any station
        latest_record = (
            db.query(Observation)
            .order_by(desc(Observation.observation_date))
            .first()
        )

    if not latest_record:
        raise HTTPException(status_code=404, detail="No observation records found in database.")

    obs_date = latest_record.observation_date

    # 2. Get all stations reporting on this date
    concurrent_obs = (
        db.query(Observation, MonitoringStation)
        .join(MonitoringStation, Observation.station_id == MonitoringStation.station_id)
        .filter(Observation.observation_date == obs_date)
        .filter(Observation.station_id != "MUMBAI_CITY")
        .all()
    )

    total_stations = db.query(MonitoringStation).filter(MonitoringStation.station_id != "MUMBAI_CITY").count()
    reporting_count = len(concurrent_obs)

    # 3. Find most and least polluted stations
    valid_station_aqis = []
    for obs, stn in concurrent_obs:
        effective_aqi = obs.calculated_aqi or obs.official_aqi
        if effective_aqi is not None:
            valid_station_aqis.append({
                "station_id": stn.station_id,
                "station_name": stn.station_name,
                "aqi": effective_aqi,
                "category": obs.calculated_bucket or obs.official_bucket or get_aqi_category(effective_aqi)[0],
                "prominent_pollutant": obs.prominent_pollutant or "PM2.5",
                "pm25": obs.pm25,
                "pm10": obs.pm10
            })

    most_polluted = max(valid_station_aqis, key=lambda x: x["aqi"]) if valid_station_aqis else None
    least_polluted = min(valid_station_aqis, key=lambda x: x["aqi"]) if valid_station_aqis else None

    # 4. Compute pollutant distribution on this date
    pollutant_distribution = {}
    for pol in ["pm25", "pm10", "no2", "so2", "co", "o3"]:
        vals = [getattr(obs, pol) for obs, _ in concurrent_obs if getattr(obs, pol) is not None]
        if vals:
            pollutant_distribution[pol.upper()] = {
                "mean": round(sum(vals) / len(vals), 1),
                "min": round(min(vals), 1),
                "max": round(max(vals), 1),
                "count": len(vals)
            }

    effective_aqi = latest_record.calculated_aqi or latest_record.official_aqi
    bucket = latest_record.calculated_bucket or latest_record.official_bucket or get_aqi_category(effective_aqi)[0]

    # Data freshness warning
    freshness_warning = None
    days_old = (date.today() - obs_date).days
    if days_old > 30:
        freshness_warning = (
            f"Notice: Displaying verified historical CPCB archive records from {obs_date.isoformat()} ({days_old} days ago). "
            "To view live real-time feeds, configure an active CPCB or OpenAQ API key in environment settings."
        )

    return LatestAQISummary(
        mumbai_aqi=effective_aqi,
        mumbai_bucket=bucket,
        observation_date=obs_date.isoformat(),
        data_provenance=latest_record.data_provenance,
        active_stations_reporting=reporting_count,
        total_stations=total_stations,
        most_polluted_station=most_polluted,
        least_polluted_station=least_polluted,
        prominent_pollutant_citywide=latest_record.prominent_pollutant or "PM2.5",
        pollutant_distribution=pollutant_distribution,
        data_freshness_warning=freshness_warning
    )

@router.get("/history", response_model=PaginatedResponse[ObservationOut], summary="Historical Observations Query")
def get_historical_observations(
    station_id: Optional[str] = Query(None, description="Station ID (e.g. MH005, MUMBAI_CITY)"),
    start_date: Optional[date] = Query(None, description="Filter start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter end date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns paginated time-series observations with station and date-range filtering.
    """
    query = db.query(Observation)
    if station_id:
        query = query.filter(Observation.station_id == station_id)
    if start_date:
        query = query.filter(Observation.observation_date >= start_date)
    if end_date:
        query = query.filter(Observation.observation_date <= end_date)

    total = query.count()
    items = (
        query.order_by(desc(Observation.observation_date))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items
    )

@router.get("/map", response_model=List[StationMapItem], summary="Interactive AQI Map Stations Data")
def get_map_stations(
    reference_date: Optional[date] = Query(None, description="Optional target date; defaults to latest available observation date"),
    db: Session = Depends(get_db)
):
    """
    Returns all monitoring stations in Mumbai with verified geographic coordinates,
    latest pollutant concentrations, and CPCB AQI classifications for the Leaflet map.
    """
    # Exclude MUMBAI_CITY synthetic station from the physical map points
    stations = db.query(MonitoringStation).filter(MonitoringStation.station_id != "MUMBAI_CITY").all()

    # Determine reference date
    if not reference_date:
        latest = db.query(func.max(Observation.observation_date)).scalar()
        reference_date = latest or date.today()

    map_items = []
    for stn in stations:
        # Find observation on or closest to reference_date
        obs = (
            db.query(Observation)
            .filter(Observation.station_id == stn.station_id)
            .filter(Observation.observation_date <= reference_date)
            .order_by(desc(Observation.observation_date))
            .first()
        )

        eff_aqi = (obs.calculated_aqi or obs.official_aqi) if obs else None
        eff_bucket = (obs.calculated_bucket or obs.official_bucket) if obs else None
        if eff_aqi and not eff_bucket:
            eff_bucket = get_aqi_category(eff_aqi)[0]

        freshness = "available"
        if not obs:
            freshness = "missing"
        elif (reference_date - obs.observation_date).days > 7:
            freshness = "stale"

        map_items.append(StationMapItem(
            station_id=stn.station_id,
            station_name=stn.station_name,
            city=stn.city,
            state=stn.state,
            latitude=stn.latitude,
            longitude=stn.longitude,
            operator=stn.operator,
            status=stn.status,
            area_type=stn.area_type,
            latest_observation_date=obs.observation_date.isoformat() if obs else None,
            latest_aqi=eff_aqi,
            latest_bucket=eff_bucket,
            pm25=obs.pm25 if obs else None,
            pm10=obs.pm10 if obs else None,
            no2=obs.no2 if obs else None,
            so2=obs.so2 if obs else None,
            co=obs.co if obs else None,
            o3=obs.o3 if obs else None,
            prominent_pollutant=obs.prominent_pollutant if obs else None,
            data_freshness_status=freshness,
            has_active_forecast=True
        ))

    return map_items
