"""Mốc thời gian giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7) cho lọc ngày, tháng và cửa sổ lưu trữ của giám sát AI."""
import re
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from app.core.domain_errors import InvalidRequestError
from app.services.learner_journey.journey_constants import VN_TZ

_MONTH = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def now_vn() -> datetime:
    return datetime.now(VN_TZ)


def parse_iso(value: Optional[str]) -> Optional[datetime]:
    """Chuỗi ISO của PostgREST (có thể đuôi Z) → datetime có múi giờ."""
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def vn_date_key(value: str) -> str:
    """Ngày giờ VN (YYYY-MM-DD) của một mốc thời gian ISO."""
    return parse_iso(value).astimezone(VN_TZ).date().isoformat()


def _vn_midnight(day: date) -> datetime:
    return datetime(day.year, day.month, day.day, tzinfo=VN_TZ)


def _parse_day(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise InvalidRequestError(f"Ngày '{value}' không hợp lệ, cần dạng YYYY-MM-DD") from None


def day_range(date_from: Optional[str], date_to: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """[00:00 ngày từ, 00:00 ngày sau ngày đến) theo giờ VN, dạng ISO để lọc `>=` và `<`. date_to gồm cả ngày đó."""
    start = _vn_midnight(_parse_day(date_from)).isoformat() if date_from else None
    end = _vn_midnight(_parse_day(date_to) + timedelta(days=1)).isoformat() if date_to else None
    return start, end


def month_window(month: Optional[str]) -> tuple[str, datetime, datetime]:
    """(nhãn YYYY-MM, đầu tháng, đầu tháng sau) giờ VN; month None = tháng hiện tại."""
    if month is None:
        today = now_vn()
        year, number = today.year, today.month
    elif _MONTH.match(month):
        year, number = int(month[:4]), int(month[5:])
    else:
        raise InvalidRequestError("Tháng không hợp lệ, cần dạng YYYY-MM")
    start = datetime(year, number, 1, tzinfo=VN_TZ)
    end = datetime(year + (number == 12), number % 12 + 1, 1, tzinfo=VN_TZ)
    return f"{year:04d}-{number:02d}", start, end
