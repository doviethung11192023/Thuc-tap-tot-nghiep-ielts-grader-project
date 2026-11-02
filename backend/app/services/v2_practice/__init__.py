"""
Luyện thi trên schema v2 (thiết kế 33 bảng, docs/source-of-truth.md §7): phần dùng chung.

Bật bằng DB_SCHEMA=v2 trong backend/.env. Khi tắt (mặc định "public") mọi endpoint
chạy code cũ trên schema public. UUID của đề/section giữ nguyên giữa public và v2
nên catalog (danh sách đề) vẫn đọc public.
"""
from app.core.config import settings
from app.db.supabase import supabase


def is_v2_enabled() -> bool:
    return (settings.DB_SCHEMA or "public").strip().lower() == "v2"


def v2db():
    """PostgREST client trỏ vào schema v2 (dùng chung token service_role của backend)."""
    return supabase.schema("v2")
