import io
import os
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from sqlalchemy.orm import Session
import pandas as pd

from app.db.session import get_db
from app.models.data_job import DataImportJob
from app.models.observation import Observation
from app.schemas.data_job import DataSourceInfo, DataImportJobOut
from app.core.config import settings
from app.services.data_ingestion import clean_val, seed_monitoring_stations
from app.services.aqi_calculator import calculate_overall_aqi

router = APIRouter()

OFFICIAL_SOURCES_METADATA = [
    DataSourceInfo(
        source_id="cpcb-caaqms",
        title="Continuous Ambient Air Quality Monitoring Stations (CAAQMS)",
        organization="Central Pollution Control Board (CPCB), MoEFCC, Govt. of India",
        type="official_caaqms",
        license="National Data Sharing and Accessibility Policy (NDSAP) / Open Government Data (OGD) India",
        coverage_period="2015-01-01 to Present",
        parameters=["PM2.5", "PM10", "NO2", "SO2", "CO", "O3", "NH3", "AQI"],
        access_status="Verified Historical Archive / Open API via data.gov.in",
        url="https://airquality.cpcb.gov.in/",
        notes="Official regulatory reference dataset used for national air quality standards and compliance."
    ),
    DataSourceInfo(
        source_id="mpcb-network",
        title="Maharashtra Pollution Control Board CAAQMS Network",
        organization="Maharashtra Pollution Control Board (MPCB)",
        type="official_caaqms",
        license="Government of Maharashtra Public Domain",
        coverage_period="Continuous 24x7 monitoring",
        parameters=["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"],
        access_status="Active monitoring across 13 MMR stations",
        url="https://mpcb.gov.in/",
        notes="State pollution control board managing CAAQMS at Bandra, Worli, Sion, Kurla, Powai, Borivali, and Navi Mumbai."
    ),
    DataSourceInfo(
        source_id="safar-iitm",
        title="System of Air Quality and Weather Forecasting And Research (SAFAR)",
        organization="Indian Institute of Tropical Meteorology (IITM), Ministry of Earth Sciences",
        type="official_caaqms",
        license="Ministry of Earth Sciences Open Data",
        coverage_period="2018 to Present",
        parameters=["PM2.5", "PM10", "O3", "CO", "NOx"],
        access_status="Scientific Research & Public Advisory",
        url="http://safar.tropmet.res.in/",
        notes="High-density scientific monitoring network providing health advisories for Mumbai metropolitan area."
    ),
    DataSourceInfo(
        source_id="openaq-platform",
        title="OpenAQ Global Ambient Air Quality Data Platform",
        organization="OpenAQ Inc. (Nonprofit)",
        type="api",
        license="Open Data Commons Open Database License (ODbL)",
        coverage_period="Global real-time aggregation",
        parameters=["pm25", "pm10", "no2", "so2", "co", "o3"],
        access_status="REST API v3 (Configurable with OPENAQ_API_KEY)",
        url="https://explore.openaq.org/",
        notes="Aggregates and standardizes public sensor and government station telemetry."
    ),
]

@router.get("/sources", response_model=List[DataSourceInfo], summary="List Documented Air Quality Data Sources")
def get_data_sources():
    """
    Returns verified metadata, licensing terms, parameters,
    and official links for all data sources integrated into Mumbai AirSense AI.
    """
    return OFFICIAL_SOURCES_METADATA

@router.get("/jobs", response_model=List[DataImportJobOut], summary="List Data Ingestion Jobs")
def get_import_jobs(db: Session = Depends(get_db)):
    """
    Returns the audit trail of all background or uploaded data import jobs.
    """
    return db.query(DataImportJob).order_by(DataImportJob.started_at.desc()).limit(50).all()

@router.post("/import", response_model=DataImportJobOut, summary="Upload & Ingest Custom CAAQMS CSV")
async def import_csv_observations(
    file: UploadFile = File(..., description="CSV file with columns: StationId, Date, PM2.5, PM10, etc."),
    api_key: Optional[str] = Form(None, description="Admin secret key for write authorization"),
    db: Session = Depends(get_db)
):
    """
    Accepts an uploaded CSV file containing official CPCB format observations,
    validates the schema, rejects malformed values, calculates NAQI sub-indices,
    and saves observations to the database.
    """
    # Simple security token check
    if api_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized. Provide a valid ADMIN_SECRET_KEY to import data.")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .csv files are supported.")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    required_cols = {"StationId", "Date"}
    if not required_cols.issubset(set(df.columns)):
        raise HTTPException(
            status_code=422,
            detail=f"Missing required columns. CSV must contain at least {required_cols}. Found: {list(df.columns)}"
        )

    # Create Job record
    job = DataImportJob(
        source_type="user_csv_upload",
        file_name=file.filename,
        status="in_progress"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Ingest records
    seed_monitoring_stations(db)
    imported = 0
    skipped = 0

    try:
        df["Date"] = pd.to_datetime(df["Date"]).dt.date
        existing = set(db.query(Observation.station_id, Observation.observation_date).all())

        new_obs = []
        for _, row in df.iterrows():
            stn_id = str(row["StationId"])
            obs_date = row["Date"]

            if (stn_id, obs_date) in existing:
                skipped += 1
                continue

            pm25 = clean_val(row.get("PM2.5"), "PM2.5")
            pm10 = clean_val(row.get("PM10"), "PM10")
            no2 = clean_val(row.get("NO2"), "NO2")
            so2 = clean_val(row.get("SO2"), "SO2")
            co = clean_val(row.get("CO"), "CO")
            o3 = clean_val(row.get("O3"), "O3")
            nh3 = clean_val(row.get("NH3"), "NH3")

            calc = calculate_overall_aqi({
                "PM2.5": pm25, "PM10": pm10, "NO2": no2,
                "SO2": so2, "CO": co, "O3": o3, "NH3": nh3
            })

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
                official_aqi=clean_val(row.get("AQI"), "PM2.5"),
                official_bucket=str(row.get("AQI_Bucket")) if pd.notna(row.get("AQI_Bucket")) else None,
                calculated_aqi=calc["aqi"],
                calculated_bucket=calc["category"],
                prominent_pollutant=calc["prominent_pollutant"],
                data_provenance="user_csv_upload",
                import_job_id=job.id
            )
            new_obs.append(obs)
            existing.add((stn_id, obs_date))

        if new_obs:
            db.bulk_save_objects(new_obs)
            db.commit()
            imported = len(new_obs)

        job.status = "completed"
        job.records_imported = imported
        job.records_skipped = skipped
        job.completed_at = datetime.utcnow()
        db.commit()

        return job

    except Exception as e:
        db.rollback()
        job.status = "failed"
        job.error_log = str(e)
        job.completed_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=500, detail=f"Import execution error: {str(e)}")
