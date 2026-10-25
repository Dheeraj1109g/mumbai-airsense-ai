"""
Data Ingestion, Validation, and Preprocessing Service for Mumbai AirSense AI.
Handles importing official CPCB station metadata and time-series observations,
cleaning data, validating ranges, calculating NAQI sub-indices, and updating the database.
"""

import os
import math
import logging
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session

from app.models.station import MonitoringStation
from app.models.observation import Observation
from app.models.data_job import DataImportJob
from app.services.aqi_calculator import calculate_overall_aqi, calculate_sub_index, get_aqi_category

logger = logging.getLogger(__name__)

# Verified CAAQMS coordinates for Mumbai Metropolitan Region
VERIFIED_STATION_COORDINATES = {
    "MH005": {"name": "Bandra, Mumbai - MPCB", "lat": 19.0583, "lon": 72.8488, "operator": "MPCB", "city": "Mumbai", "area": "Commercial/Residential"},
    "MH006": {"name": "Borivali East, Mumbai - MPCB", "lat": 19.2294, "lon": 72.8608, "operator": "MPCB", "city": "Mumbai", "area": "Suburban/Residential"},
    "MH007": {"name": "Chhatrapati Shivaji Intl. Airport (T2), Mumbai - MPCB", "lat": 19.0974, "lon": 72.8744, "operator": "MPCB/AAI", "city": "Mumbai", "area": "Airport/Transport Hub"},
    "MH008": {"name": "Colaba, Mumbai - MPCB", "lat": 18.9067, "lon": 72.8147, "operator": "MPCB/IITM", "city": "Mumbai", "area": "Coastal/Urban"},
    "MH009": {"name": "Kurla, Mumbai - MPCB", "lat": 19.0726, "lon": 72.8797, "operator": "MPCB", "city": "Mumbai", "area": "Industrial/Transit"},
    "MH010": {"name": "Powai, Mumbai - MPCB", "lat": 19.1257, "lon": 72.9157, "operator": "MPCB/IITB", "city": "Mumbai", "area": "Institutional/Residential"},
    "MH011": {"name": "Sion, Mumbai - MPCB", "lat": 19.0390, "lon": 72.8619, "operator": "MPCB", "city": "Mumbai", "area": "Urban Traffic Corridor"},
    "MH012": {"name": "Vasai West, Mumbai - MPCB", "lat": 19.3667, "lon": 72.8156, "operator": "MPCB", "city": "Palghar/MMR", "area": "Peri-Urban"},
    "MH013": {"name": "Vile Parle West, Mumbai - MPCB", "lat": 19.1006, "lon": 72.8361, "operator": "MPCB", "city": "Mumbai", "area": "Urban Residential"},
    "MH014": {"name": "Worli, Mumbai - MPCB", "lat": 19.0163, "lon": 72.8170, "operator": "MPCB", "city": "Mumbai", "area": "South-Central Coastal"},
    "MH017": {"name": "Airoli, Navi Mumbai - MPCB", "lat": 19.1554, "lon": 72.9972, "operator": "MPCB", "city": "Navi Mumbai", "area": "Industrial/IT"},
    "MH018": {"name": "Mahape, Navi Mumbai - MPCB", "lat": 19.1171, "lon": 73.0183, "operator": "MPCB", "city": "Navi Mumbai", "area": "Industrial Zone"},
    "MH019": {"name": "Nerul, Navi Mumbai - MPCB", "lat": 19.0330, "lon": 73.0297, "operator": "MPCB", "city": "Navi Mumbai", "area": "Residential/Suburban"},
    "MUMBAI_CITY": {"name": "Mumbai City-wide Benchmark - CPCB", "lat": 19.0760, "lon": 72.8777, "operator": "CPCB", "city": "Mumbai", "area": "Metropolitan Composite"},
}

# Physical bounds for validation (concentrations beyond these are marked as sensor faults)
VALID_RANGES = {
    "PM2.5": (0.0, 1000.0),
    "PM10": (0.0, 1500.0),
    "NO2": (0.0, 800.0),
    "SO2": (0.0, 1000.0),
    "CO": (0.0, 100.0),
    "O3": (0.0, 800.0),
    "NH3": (0.0, 1000.0),
}

def clean_val(val: Any, pollutant: str) -> Optional[float]:
    """Validate numeric reading against reasonable physical thresholds."""
    if val is None or pd.isna(val):
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        min_v, max_v = VALID_RANGES.get(pollutant, (0.0, 5000.0))
        if f < min_v or f > max_v:
            return None
        return round(f, 2)
    except (ValueError, TypeError):
        return None

def seed_monitoring_stations(db: Session) -> int:
    """Populate monitoring_stations table with verified coordinates and metadata."""
    count = 0
    for stn_id, meta in VERIFIED_STATION_COORDINATES.items():
        existing = db.query(MonitoringStation).filter(MonitoringStation.station_id == stn_id).first()
        if not existing:
            stn = MonitoringStation(
                station_id=stn_id,
                station_name=meta["name"],
                city=meta["city"],
                state="Maharashtra",
                latitude=meta["lat"],
                longitude=meta["lon"],
                operator=meta["operator"],
                status="Active",
                area_type=meta["area"]
            )
            db.add(stn)
            count += 1
        else:
            # Update coordinates if changed
            existing.latitude = meta["lat"]
            existing.longitude = meta["lon"]
            existing.operator = meta["operator"]
            existing.area_type = meta["area"]
    db.commit()
    logger.info(f"Seeded {count} new monitoring stations.")
    return count

def seed_demo_user(db: Session) -> None:
    """Ensure the default demo citizen account (Dheeraj) exists with pre-configured credentials."""
    from app.models.user import User
    demo = db.query(User).filter(User.email == "demo@airsense.in").first()
    if not demo:
        demo = User(
            full_name="Dheeraj",
            email="demo@airsense.in",
            password_hash=User.hash_password("airsense2026"),
            preferred_station="MH005",
            is_active=True
        )
        db.add(demo)
        db.commit()
        logger.info("Seeded default demo citizen account (Dheeraj).")
    else:
        demo.full_name = "Dheeraj"
        db.commit()
        logger.info("Updated demo citizen full_name to Dheeraj.")

def ingest_cpcb_datasets(
    db: Session,
    station_day_csv: str,
    city_day_csv: str,
    provenance: str = "cpcb_historical_archive"
) -> Dict[str, Any]:
    """
    Ingests official CPCB Mumbai station and city-wide daily records into the observations table.
    Calculates NAQI sub-indices, categories, and prominent pollutants for every record.
    """
    # 1. Create DataImportJob record
    job = DataImportJob(
        source_type=provenance,
        file_name=f"{os.path.basename(station_day_csv)}, {os.path.basename(city_day_csv)}",
        status="in_progress"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Ensure stations exist
    seed_monitoring_stations(db)

    imported = 0
    skipped = 0
    errors = []

    try:
        # 2. Ingest Station Observations
        if os.path.exists(station_day_csv):
            df_stn = pd.read_csv(station_day_csv)
            mumbai_stn_ids = list(VERIFIED_STATION_COORDINATES.keys())
            df_mumbai = df_stn[df_stn["StationId"].isin(mumbai_stn_ids)].copy()
            df_mumbai["Date"] = pd.to_datetime(df_mumbai["Date"]).dt.date

            # Fetch existing observation dates to prevent duplicates
            existing_records = set(
                db.query(Observation.station_id, Observation.observation_date).all()
            )

            records_to_insert = []
            for _, row in df_mumbai.iterrows():
                stn_id = str(row["StationId"])
                obs_date = row["Date"]

                if (stn_id, obs_date) in existing_records:
                    skipped += 1
                    continue

                pm25 = clean_val(row.get("PM2.5"), "PM2.5")
                pm10 = clean_val(row.get("PM10"), "PM10")
                no2 = clean_val(row.get("NO2"), "NO2")
                so2 = clean_val(row.get("SO2"), "SO2")
                co = clean_val(row.get("CO"), "CO")
                o3 = clean_val(row.get("O3"), "O3")
                nh3 = clean_val(row.get("NH3"), "NH3")

                # Compute official CPCB sub-indices and overall AQI
                pollutant_dict = {
                    "PM2.5": pm25, "PM10": pm10, "NO2": no2,
                    "SO2": so2, "CO": co, "O3": o3, "NH3": nh3
                }
                calc_result = calculate_overall_aqi(pollutant_dict)

                # Official reported AQI in dataset
                off_aqi = clean_val(row.get("AQI"), "PM2.5")  # numeric
                off_bucket = str(row.get("AQI_Bucket")) if pd.notna(row.get("AQI_Bucket")) else None

                obs = Observation(
                    station_id=stn_id,
                    observation_date=obs_date,
                    pm25=pm25,
                    pm10=pm10,
                    no2=no2,
                    so2=so2,
                    co=co,
                    o3=o3,
                    nh3=nh3,
                    official_aqi=off_aqi,
                    official_bucket=off_bucket,
                    calculated_aqi=calc_result["aqi"],
                    calculated_bucket=calc_result["category"],
                    prominent_pollutant=calc_result["prominent_pollutant"],
                    data_provenance=provenance,
                    import_job_id=job.id
                )
                records_to_insert.append(obs)
                existing_records.add((stn_id, obs_date))

                # Batch commit every 1000 rows
                if len(records_to_insert) >= 1000:
                    db.bulk_save_objects(records_to_insert)
                    db.commit()
                    imported += len(records_to_insert)
                    records_to_insert = []

            if records_to_insert:
                db.bulk_save_objects(records_to_insert)
                db.commit()
                imported += len(records_to_insert)

        # 3. Ingest City-Level Benchmark Observations (MUMBAI_CITY)
        if os.path.exists(city_day_csv):
            df_city = pd.read_csv(city_day_csv)
            df_mum_city = df_city[df_city["City"] == "Mumbai"].copy()
            df_mum_city["Date"] = pd.to_datetime(df_mum_city["Date"]).dt.date

            existing_city = set(
                row[0] for row in db.query(Observation.observation_date)
                .filter(Observation.station_id == "MUMBAI_CITY").all()
            )

            city_records = []
            for _, row in df_mum_city.iterrows():
                obs_date = row["Date"]
                if obs_date in existing_city:
                    skipped += 1
                    continue

                pm25 = clean_val(row.get("PM2.5"), "PM2.5")
                pm10 = clean_val(row.get("PM10"), "PM10")
                no2 = clean_val(row.get("NO2"), "NO2")
                so2 = clean_val(row.get("SO2"), "SO2")
                co = clean_val(row.get("CO"), "CO")
                o3 = clean_val(row.get("O3"), "O3")
                nh3 = clean_val(row.get("NH3"), "NH3")

                pollutant_dict = {
                    "PM2.5": pm25, "PM10": pm10, "NO2": no2,
                    "SO2": so2, "CO": co, "O3": o3, "NH3": nh3
                }
                calc_result = calculate_overall_aqi(pollutant_dict)
                off_aqi = clean_val(row.get("AQI"), "PM2.5")
                off_bucket = str(row.get("AQI_Bucket")) if pd.notna(row.get("AQI_Bucket")) else None

                obs = Observation(
                    station_id="MUMBAI_CITY",
                    observation_date=obs_date,
                    pm25=pm25,
                    pm10=pm10,
                    no2=no2,
                    so2=so2,
                    co=co,
                    o3=o3,
                    nh3=nh3,
                    official_aqi=off_aqi,
                    official_bucket=off_bucket,
                    calculated_aqi=calc_result["aqi"],
                    calculated_bucket=calc_result["category"],
                    prominent_pollutant=calc_result["prominent_pollutant"],
                    data_provenance=provenance,
                    import_job_id=job.id
                )
                city_records.append(obs)
                existing_city.add(obs_date)

            if city_records:
                db.bulk_save_objects(city_records)
                db.commit()
                imported += len(city_records)

        # Update Job Status
        job.status = "completed"
        job.records_imported = imported
        job.records_skipped = skipped
        job.completed_at = datetime.utcnow()
        db.commit()

        return {
            "status": "completed",
            "job_id": job.id,
            "records_imported": imported,
            "records_skipped": skipped,
            "errors": errors
        }

    except Exception as e:
        db.rollback()
        logger.exception("Data ingestion error")
        job.status = "failed"
        job.error_log = str(e)
        job.completed_at = datetime.utcnow()
        db.commit()
        raise e
