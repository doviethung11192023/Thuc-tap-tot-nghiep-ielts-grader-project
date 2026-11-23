"""Body request của API giám sát AI (spec 008). Giới hạn 50 bài và bỏ trùng xử lý ở regrade_service."""
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class RegradeRequest(BaseModel):
    attempt_ids: list[UUID] = Field(min_length=1, max_length=500)


class AiPricingUpdate(BaseModel):
    """Trường vắng mặt = không đổi; budget_usd = null là tắt cảnh báo ngân sách."""
    prices: Optional[dict[str, Any]] = None
    budget_usd: Optional[float] = None
