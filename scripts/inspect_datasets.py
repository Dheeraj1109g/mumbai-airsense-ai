"""
Mumbai AirSense AI - Phase 1 Dataset Inspection and Verification Script
Inspects raw datasets downloaded from official CPCB data archives:
- datasets/raw/stations.csv
- datasets/raw/station_day.csv
- datasets/raw/city_day.csv
"""

import os
import json
import pandas as pd
import numpy as np

def run_inspection():
    raw_dir = os.path.join(os.path.dirname(__file__), "..", "datasets", "raw")
    stations_path = os.path.join(raw_dir, "stations.csv")
    station_day_path = os.path.join(raw_dir, "station_day.csv")
    city_day_path = os.path.join(raw_dir, "city_day.csv")

    print("==================================================")
    print("MUMBAI AIRSENSE AI - OFFICIAL DATASET VERIFICATION")
    print("==================================================")

    # 1. Inspect Stations Metadata
    df_stations = pd.read_csv(stations_path)
    print(f"\n1. STATIONS METADATA: Total stations across India = {len(df_stations)}")
    
    # Filter for Mumbai and Navi Mumbai / MMR
    mumbai_stations = df_stations[
        df_stations["City"].isin(["Mumbai", "Navi Mumbai"]) | 
        df_stations["StationName"].str.contains("Mumbai", case=False, na=False)
    ].copy()
    
    print(f"Stations in Mumbai Metropolitan Region: {len(mumbai_stations)}")
    for idx, row in mumbai_stations.iterrows():
        print(f"  [{row['StationId']}] {row['StationName']} | City: {row['City']} | Status: {row['Status']}")

    mumbai_station_ids = mumbai_stations["StationId"].tolist()

    # 2. Inspect Station Daily Observations
    print(f"\n2. STATION DAILY OBSERVATIONS (station_day.csv)")
    df_stn_day = pd.read_csv(station_day_path)
    print(f"Total rows in station_day.csv: {len(df_stn_day):,}")
    print(f"Columns: {list(df_stn_day.columns)}")

    df_mumbai_stns = df_stn_day[df_stn_day["StationId"].isin(mumbai_station_ids)].copy()
    df_mumbai_stns["Date"] = pd.to_datetime(df_mumbai_stns["Date"])
    print(f"Mumbai station observations count: {len(df_mumbai_stns):,}")
    print(f"Date range: {df_mumbai_stns['Date'].min().strftime('%Y-%m-%d')} to {df_mumbai_stns['Date'].max().strftime('%Y-%m-%d')}")

    # Station-wise breakdown
    print("\nStation-wise breakdown in Mumbai:")
    pollutants = ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"]
    station_stats = []
    
    for stn_id in sorted(df_mumbai_stns["StationId"].unique()):
        sub = df_mumbai_stns[df_mumbai_stns["StationId"] == stn_id]
        stn_name = mumbai_stations[mumbai_stations["StationId"] == stn_id]["StationName"].values[0] if stn_id in df_stations["StationId"].values else stn_id
        
        stat = {
            "StationId": stn_id,
            "StationName": stn_name,
            "TotalRows": len(sub),
            "StartDate": sub["Date"].min().strftime("%Y-%m-%d"),
            "EndDate": sub["Date"].max().strftime("%Y-%m-%d"),
            "PM2.5_valid": int(sub["PM2.5"].notna().sum()),
            "PM2.5_missing_pct": round(float(sub["PM2.5"].isna().mean() * 100), 1),
            "PM10_valid": int(sub["PM10"].notna().sum()),
            "PM10_missing_pct": round(float(sub["PM10"].isna().mean() * 100), 1),
            "NO2_valid": int(sub["NO2"].notna().sum()),
            "AQI_valid": int(sub["AQI"].notna().sum())
        }
        station_stats.append(stat)
        print(f"  - {stn_id} ({stn_name}): {len(sub)} rows, Date: {stat['StartDate']} to {stat['EndDate']}, PM2.5 valid: {stat['PM2.5_valid']} ({100 - stat['PM2.5_missing_pct']}%), AQI valid: {stat['AQI_valid']}")

    # 3. Inspect City-level Daily Observations (Mumbai)
    print(f"\n3. CITY DAILY OBSERVATIONS (city_day.csv)")
    df_city_day = pd.read_csv(city_day_path)
    df_city_mumbai = df_city_day[df_city_day["City"] == "Mumbai"].copy()
    df_city_mumbai["Date"] = pd.to_datetime(df_city_mumbai["Date"])
    print(f"Mumbai city observations count: {len(df_city_mumbai):,}")
    print(f"Date range: {df_city_mumbai['Date'].min().strftime('%Y-%m-%d')} to {df_city_mumbai['Date'].max().strftime('%Y-%m-%d')}")
    print("City-level missing data percentages for Mumbai:")
    for col in pollutants + ["AQI"]:
        if col in df_city_mumbai.columns:
            valid = df_city_mumbai[col].notna().sum()
            miss_pct = round(df_city_mumbai[col].isna().mean() * 100, 2)
            mean_val = round(df_city_mumbai[col].mean(), 2) if valid > 0 else 0
            print(f"  {col}: {valid} valid rows ({100 - miss_pct}%), Missing: {miss_pct}%, Mean: {mean_val}")

    # Summary report output
    summary = {
        "status": "verified",
        "mumbai_station_count": len(mumbai_stations),
        "total_station_records": len(df_mumbai_stns),
        "total_city_records": len(df_city_mumbai),
        "date_range_start": df_mumbai_stns['Date'].min().strftime("%Y-%m-%d"),
        "date_range_end": df_mumbai_stns['Date'].max().strftime("%Y-%m-%d"),
        "stations": station_stats
    }
    
    out_file = os.path.join(os.path.dirname(__file__), "..", "reports", "dataset_profile_phase1.json")
    with open(out_file, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\nProfile summary written to {out_file}")

if __name__ == "__main__":
    run_inspection()
