from sqlalchemy import Column, Integer, String, DateTime, Text, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class DataImportJob(Base):
    __tablename__ = "data_import_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source_type = Column(String(50), nullable=False)  # cpcb_historical_archive | openaq_api | user_csv_upload
    file_name = Column(String(255), nullable=True)
    records_imported = Column(Integer, default=0)
    records_skipped = Column(Integer, default=0)
    status = Column(String(50), default="in_progress")  # in_progress | completed | failed
    error_log = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    observations = relationship("Observation", back_populates="import_job")
