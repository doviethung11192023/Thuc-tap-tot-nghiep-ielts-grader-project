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
    AI_ENGINE_SPEAKING_URL: str = "http://localhost:8001/grade-speaking"
    AI_ENGINE_SECRET: str = ""
    # Khoá Fernet mã hoá API key AI lưu trong DB (spec 008, FR-043); thiếu thì chặn lưu key, phần còn lại vẫn chạy
    AI_SECRETS_ENCRYPTION_KEY: str = ""
    # Dựng link trace: {LANGFUSE_BASE_URL}/project/{LANGFUSE_PROJECT_ID}/traces/{trace_id} (không phải key)
    LANGFUSE_BASE_URL: str = ""
    LANGFUSE_PROJECT_ID: str = ""
    # AI_ENGINE_URL: str = "https://dd03-2405-4802-80bc-cca0-6c28-e1b1-6417-dd23.ngrok-free.app/grade"

    # Cloudflare R2 Storage (S3-compatible)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "ielts-grader-media"
    R2_PUBLIC_DOMAIN: str = ""
    # Bucket KHÔNG public cho audio bài làm (ADR-05, NFR-07): chỉ truy cập bằng presigned URL.
    R2_PRIVATE_BUCKET_NAME: str = ""

    # Địa chỉ frontend, dùng dựng link trong email mời / đặt lại mật khẩu của Expert, Admin.
    # Production phải đặt domain thật và domain đó phải nằm trong Redirect URLs của Supabase Auth
    FRONTEND_URL: str = "http://localhost:3000"
    # Origin frontend được gọi API (CORS), cách nhau bởi dấu phẩy; production phải đặt domain thật
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Tắt /docs, /redoc, /openapi.json khi deploy công khai
    ENABLE_API_DOCS: bool = True

    # Postgres trực tiếp (Session pooler) cho migration/psql; Core API không dùng
    SUPABASE_DB_URL: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()