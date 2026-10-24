from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    station_id = Column(String(50), ForeignKey("monitoring_stations.station_id"), nullable=False, index=True)
    observation_date = Column(Date, nullable=False, index=True)
    observation_time = Column(DateTime(timezone=True), nullable=True)

    # Core 6 pollutants monitored in CAAQMS (plus NH3 when present)
    pm25 = Column(Float, nullable=True)
    pm10 = Column(Float, nullable=True)
    no2 = Column(Float, nullable=True)
    so2 = Column(Float, nullable=True)
    co = Column(Float, nullable=True)
    o3 = Column(Float, nullable=True)
    nh3 = Column(Float, nullable=True)

    # Official CPCB reported values
    official_aqi = Column(Float, nullable=True)
    official_bucket = Column(String(50), nullable=True)

    # Official Indian NAQI calculated values
    calculated_aqi = Column(Float, nullable=True)
    calculated_bucket = Column(String(50), nullable=True)
    prominent_pollutant = Column(String(50), nullable=True)

    # Provenance tracking (e.g. "cpcb_historical_archive", "live_api", "csv_import")
    data_provenance = Column(String(50), default="cpcb_historical_archive", nullable=False)
    import_job_id = Column(Integer, ForeignKey("data_import_jobs.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Constraints: One observation per station per day/timestamp
    __table_args__ = (
        UniqueConstraint("station_id", "observation_date", name="uq_station_observation_date"),
    )

    # Relationships
    station = relationship("MonitoringStation", back_populates="observations")
    import_job = relationship("DataImportJob", back_populates="observations")
