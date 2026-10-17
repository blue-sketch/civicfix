import os
import json
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Civic Fix"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "civicfix-production-secure-jwt-secret-key-2026-very-strong")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # PostGIS database URL (using psycopg2 driver)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg2://civicfix_user:civicfix_password_2026@localhost:5433/civicfix"
    )
    
    # Upload storage
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # Default Pune coordinates (approx Pune Municipal Corporation / Shaniwar Wada)
    DEFAULT_MAP_LAT: float = 18.5204
    DEFAULT_MAP_LON: float = 73.8567
    
    # CORS (raw string field so pydantic-settings never fails parsing * or comma-separated lists)
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:8000"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        raw = (self.CORS_ORIGINS or "").strip()
        if not raw:
            return ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://localhost:8000"]
        if raw == "*":
            return ["*"]
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(x).strip() for x in parsed if str(x).strip()]
            except Exception:
                pass
        return [item.strip() for item in raw.split(",") if item.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
