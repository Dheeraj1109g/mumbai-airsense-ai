import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

_default_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "airsense.db")).replace("\\", "/")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Mumbai AirSense AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Absolute sqlite path ensures consistent database resolution across CLI, backend, and tests
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_default_db_path}")
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]
    
    # Model Artifacts Directory
    MODEL_DIR: str = os.getenv("MODEL_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "saved")))
    
    # Raw Datasets Directory
    DATA_DIR: str = os.getenv("DATA_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "datasets")))
    
    # External APIs
    CPCB_API_KEY: str = os.getenv("CPCB_API_KEY", "")
    OPENAQ_API_KEY: str = os.getenv("OPENAQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Security Token
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "mumbai-airsense-dev-secret-key-2026")
    
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
