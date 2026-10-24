import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    APP_NAME: str = "DeepTrace Forensics"
    APP_VERSION: str = "2.4.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Server Binding
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Supabase Configuration
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY", "")
    SUPABASE_JWT_SECRET: Optional[str] = os.getenv("SUPABASE_JWT_SECRET", "super-secret-jwt-token-forensics-police")
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_BUCKET_NAME: str = "evidence"
    
    # Celery & Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
    
    # Evidence & Media Limits
    MAX_IMAGE_SIZE_BYTES: int = 50 * 1024 * 1024       # 50 MB
    MAX_VIDEO_SIZE_BYTES: int = 200 * 1024 * 1024      # 200 MB
    MAX_LINK_FETCH_BYTES: int = 50 * 1024 * 1024       # 50 MB
    LINK_FETCH_TIMEOUT_SECONDS: int = 12               # 12s timeout
    SIGNED_URL_EXPIRY_SECONDS: int = 3600              # 1 hour
    
    # Local Storage Directory for offline/demo operation
    LOCAL_STORAGE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage_vault"))
    SQLITE_DB_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage_vault", "deeptrace.db"))

settings = Settings()

# Ensure local storage vault directory exists
os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.LOCAL_STORAGE_DIR, "evidence"), exist_ok=True)
os.makedirs(os.path.join(settings.LOCAL_STORAGE_DIR, "heatmaps"), exist_ok=True)
os.makedirs(os.path.join(settings.LOCAL_STORAGE_DIR, "reports"), exist_ok=True)
