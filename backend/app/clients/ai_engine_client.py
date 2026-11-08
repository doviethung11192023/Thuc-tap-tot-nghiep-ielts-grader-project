"""Gọi AI engine: POST /grade (thử lại tối đa 3 lần, UC-09 E1) và POST /grade-speaking."""
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
    # Secret nội bộ: /grade của AI engine từ chối request không có (giống /grade-speaking)
    headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true",
               "X-AI-Engine-Secret": settings.AI_ENGINE_SECRET}

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


SPEAKING_TIMEOUT_SECONDS = 600.0
SPEAKING_TRIES = 2
_RETRYABLE_STATUS = (502, 503, 504)


async def call_ai_grade_speaking(title: str, answers: list[dict[str, Any]]) -> dict[str, Any]:
    """Một lượt chấm Speaking tốn GPU và LLM nên chỉ thử lại lỗi tạm thời, không thử lại lỗi 4xx/500."""
    headers = {"Content-Type": "application/json", "X-AI-Engine-Secret": settings.AI_ENGINE_SECRET}
    payload = {"title": title, "answers": answers}
    last_error = ""
    for attempt in range(SPEAKING_TRIES):
        try:
            async with httpx.AsyncClient(timeout=SPEAKING_TIMEOUT_SECONDS) as client:
                response = await client.post(settings.AI_ENGINE_SPEAKING_URL, json=payload, headers=headers)
            if response.status_code == 200:
                return response.json()
            last_error = f"HTTP {response.status_code}: {response.text[:500]}"
            if response.status_code not in _RETRYABLE_STATUS:
                break
        except httpx.TimeoutException as e:
            # Engine có thể vẫn đang chạy lượt này; gọi lại sẽ tốn GPU hai lần cho cùng một bài.
            raise RuntimeError(f"AI engine speaking grading timed out: {type(e).__name__}") from e
        except httpx.TransportError as e:
            last_error = f"{type(e).__name__}: {e}"
        if attempt < SPEAKING_TRIES - 1:
            await asyncio.sleep(5)
    raise RuntimeError(f"AI engine speaking grading failed: {last_error}")
