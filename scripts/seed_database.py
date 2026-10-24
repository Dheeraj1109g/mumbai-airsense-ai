"""
Database Seeding Script for Mumbai AirSense AI.
Populates monitoring_stations and observations using verified CPCB raw datasets:
- datasets/raw/station_day.csv
- datasets/raw/city_day.csv
"""

import os
import sys

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal, engine, Base
from app.services.data_ingestion import seed_monitoring_stations, ingest_cpcb_datasets

def main():
    print("==================================================")
    print("MUMBAI AIRSENSE AI - DATABASE INITIALIZATION & SEED")
    print("==================================================")

    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    print("Database tables verified.")

    db = SessionLocal()
    try:
        # 1. Seed stations
        print("\n1. Seeding verified CAAQMS Mumbai monitoring stations...")
        stn_count = seed_monitoring_stations(db)
        print(f"   Stations configured: {stn_count} (Total active: 14 stations)")

        # 2. Ingest CPCB observations
        raw_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "datasets", "raw"))
        station_day_csv = os.path.join(raw_dir, "station_day.csv")
        city_day_csv = os.path.join(raw_dir, "city_day.csv")

        print("\n2. Ingesting official CPCB historical observations...")
        res = ingest_cpcb_datasets(db, station_day_csv, city_day_csv)
        print(f"   Import status: {res['status']}")
        print(f"   Records imported: {res['records_imported']:,}")
        print(f"   Records skipped (duplicates): {res['records_skipped']:,}")

        print("\nDatabase initialization complete!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
