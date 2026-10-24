from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_code = Column(String(50), nullable=False, index=True)  # arima | prophet | lstm | baseline
    version_tag = Column(String(50), nullable=False)
    target_pollutant = Column(String(50), nullable=False, default="PM2.5")
    target_station_id = Column(String(50), ForeignKey("monitoring_stations.station_id"), nullable=True)
    hyperparameters = Column(JSON, nullable=True)
    artifact_path = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    trained_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    metrics = relationship("ModelMetric", back_populates="model_version", cascade="all, delete-orphan")
    forecast_runs = relationship("ForecastRun", back_populates="model_version", cascade="all, delete-orphan")


class ModelMetric(Base):
    __tablename__ = "model_metrics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=False, index=True)
    split_type = Column(String(50), default="test")  # test | validation | train
    eval_start_date = Column(Date, nullable=False)
    eval_end_date = Column(Date, nullable=False)
    sample_count = Column(Integer, nullable=False)
    
    # Core error metrics
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    mape = Column(Float, nullable=True)  # Can be None if zero values exist
    coverage_95 = Column(Float, nullable=True)  # Empirical coverage for prediction interval
    
    # Station & temporal breakdown
    station_id = Column(String(50), nullable=True)
    residual_summary = Column(JSON, nullable=True)  # Mean, std, skew, 5th/95th percentiles
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    model_version = relationship("ModelVersion", back_populates="metrics")
