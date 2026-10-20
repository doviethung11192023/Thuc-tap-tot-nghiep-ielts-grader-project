from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "IELTS Grader API"
    API_V1_STR: str = "/api/v1"
    SUPABASE_URL: str
    SUPABASE_KEY: str
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379"
    SUPABASE_JWT_SECRET: str
    AI_ENGINE_URL: str = "http://localhost:8001/grade"
    # AI_ENGINE_URL: str = "https://dd03-2405-4802-80bc-cca0-6c28-e1b1-6417-dd23.ngrok-free.app/grade"

    # Cloudflare R2 Storage (S3-compatible)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "ielts-grader-media"
    R2_PUBLIC_DOMAIN: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()