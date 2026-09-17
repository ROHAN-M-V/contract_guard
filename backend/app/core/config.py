from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Contract Guard"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "sqlite:///./contract_guard.db"
    
    # Optional Supabase storage configuration (authentication is local JWT).
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_STORAGE_BUCKET: str = "contract-documents"
    
    # AI Engine Integration
    USE_MOCK_AI: bool = True
    AI_ANALYSIS_SERVICE_URL: str = "http://localhost:8001"
    AI_MODEL_API_KEY: Optional[str] = None
    ALLOW_PUBLIC_REGISTRATION: bool = False
    
    # Security
    SECRET_KEY: str = "contract-guard-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"


settings = Settings()
