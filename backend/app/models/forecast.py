from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class ForecastRun(Base):
    __tablename__ = "forecast_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=False, index=True)
    station_id = Column(String(50), ForeignKey("monitoring_stations.station_id"), nullable=False, index=True)
    target_pollutant = Column(String(50), nullable=False, default="PM2.5")
    run_timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    horizon_days = Column(Integer, nullable=False, default=7)
    forecast_type = Column(String(50), default="daily")  # daily | hourly

    # Relationships
    model_version = relationship("ModelVersion", back_populates="forecast_runs")
    station = relationship("MonitoringStation", back_populates="forecast_runs")
    values = relationship("ForecastValue", back_populates="forecast_run", cascade="all, delete-orphan")


class ForecastValue(Base):
    __tablename__ = "forecast_values"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    forecast_run_id = Column(Integer, ForeignKey("forecast_runs.id"), nullable=False, index=True)
    forecast_date = Column(Date, nullable=False, index=True)
    
    # Predicted pollutant concentration (e.g. PM2.5 in ug/m3)
    predicted_pollutant_value = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=True)  # 95% confidence/credible lower bound
    upper_bound = Column(Float, nullable=True)  # 95% confidence/credible upper bound
    
    # Calculated predicted AQI (derived through official CPCB breakpoints)
    calculated_predicted_aqi = Column(Float, nullable=True)
    predicted_aqi_bucket = Column(String(50), nullable=True)

    # Relationships
    forecast_run = relationship("ForecastRun", back_populates="values")
