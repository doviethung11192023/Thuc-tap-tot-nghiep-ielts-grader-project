"""Cấu hình chạy cho AI engine kéo về (GET /internal/ai-engine/runtime-config), gồm key đã giải mã (FR-046).
Chỉ route nội bộ có secret được gọi hàm này; KHÔNG dùng cho response trình duyệt."""
from typing import Any, Optional

from app.services.ai_services import ai_runtime_config_store as store
from app.services.ai_services.ai_secret_cipher import decrypt_secret
from app.services.ai_services.ai_step_catalog import PROVIDERS


def clean_override(section: dict[str, Any]) -> dict[str, Any]:
    """Bỏ trường null: null = không ghi đè."""
    return {k: v for k, v in (section or {}).items() if v is not None}


def _latest(*stamps: Optional[str]) -> str:
    present = [s for s in stamps if s]
    return max(present) if present else "initial"


def build_engine_runtime_config() -> dict[str, Any]:
    config = store.read_runtime_config()
    value = config["value"]
    secret_rows = store.read_secret_rows()
    keys: dict[str, Optional[str]] = {provider: None for provider in PROVIDERS}
    for row in secret_rows:
        if row.get("provider") in keys:
            keys[row["provider"]] = decrypt_secret(row.get("ciphertext") or "", row["provider"])
    steps = {name: clean_override(section) for name, section in value["steps"].items()}
    return {
        # version đổi khi cấu hình hoặc bất kỳ key nào đổi
        "version": _latest(config["updated_at"], *(r.get("updated_at") for r in secret_rows)),
        "steps": {name: section for name, section in steps.items() if section},
        "llm": clean_override(value["llm"]), "jev": clean_override(value["jev"]),
        "keys": keys,
    }
