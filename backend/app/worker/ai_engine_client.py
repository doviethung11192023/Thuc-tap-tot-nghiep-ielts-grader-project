"""Gọi AI engine POST /grade, thử lại tối đa 3 lần có backoff (UC-09 E1)."""
import asyncio
from typing import Any, Optional

import httpx

from app.core.config import settings

MAX_RETRIES = 3
TIMEOUT_SECONDS = 300.0


async def call_ai_grade(title: str, essay: str, task_no: Optional[int], image_url: Optional[str]) -> dict[str, Any]:
    """Trả JSON kết quả chấm; hết lượt thử thì raise RuntimeError kèm lỗi cuối."""
    payload: dict[str, Any] = {"title": title, "essay": essay}
    if task_no:
        payload["task_type"] = f"task{task_no}"
        payload["image_url"] = image_url
    headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}

    last_error = ""
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                response = await client.post(settings.AI_ENGINE_URL, json=payload, headers=headers)
            if response.status_code == 200:
                return response.json()
            last_error = f"HTTP {response.status_code}: {response.text[:500]}"
        except Exception as e:  # mạng, timeout
            last_error = f"{type(e).__name__}: {e}"
        if attempt < MAX_RETRIES - 1:
            print(f"⚠️ [AI Engine] lỗi ({last_error}), thử lại lần {attempt + 1}...")
            await asyncio.sleep(2 ** attempt)
    raise RuntimeError(f"AI engine failed after {MAX_RETRIES} attempts: {last_error}")
