from sqlalchemy import Column, String, Float, DateTime, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class MonitoringStation(Base):
    __tablename__ = "monitoring_stations"

    station_id = Column(String(50), primary_key=True, index=True)
    station_name = Column(String(150), nullable=False)
    city = Column(String(50), nullable=False, default="Mumbai", index=True)
    state = Column(String(50), nullable=False, default="Maharashtra")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    operator = Column(String(100), default="MPCB")
    status = Column(String(50), default="Active")
    area_type = Column(String(50), default="Urban")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    observations = relationship("Observation", back_populates="station", cascade="all, delete-orphan")
    forecast_runs = relationship("ForecastRun", back_populates="station", cascade="all, delete-orphan")
