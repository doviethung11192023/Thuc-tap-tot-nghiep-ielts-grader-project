"""
Dịch vụ tính toán hạn SLA cho Phân hệ Chuyên gia (Expert Review).
Tuân thủ BR-11 và FR-39 trong docs/source-of-truth.md:
- BR-11: Hạn 48 giờ làm việc (chỉ đếm Thứ Hai - Thứ Sáu giờ Việt Nam GMT+7).
  Ví dụ: Giao 15:00 Thứ Sáu -> Hạn 15:00 Thứ Ba tuần sau.
         Giao Thứ Bảy -> Bắt đầu đếm từ 00:00 Thứ Hai -> Hạn 00:00 Thứ Tư.
- FR-39: Quyền từ chối nhận bài trong 2 giờ làm việc đầu tiên kể từ lúc giao.
"""

from datetime import datetime, timedelta
import zoneinfo

TZ_VN = zoneinfo.ZoneInfo("Asia/Ho_Chi_Minh")

def add_business_hours(start: datetime, hours: float = 48.0) -> datetime:
    """
    Cộng số giờ làm việc (chỉ đếm thứ Hai đến thứ Sáu theo giờ Việt Nam GMT+7).
    """
    if start.tzinfo is None:
        cur = start.replace(tzinfo=TZ_VN)
    else:
        cur = start.astimezone(TZ_VN)

    # Nếu bắt đầu vào cuối tuần (Thứ 7 hoặc Chủ Nhật), dịch đến 00:00 Thứ Hai
    if cur.weekday() == 5:  # Thứ Bảy
        cur = (cur + timedelta(days=2)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif cur.weekday() == 6:  # Chủ Nhật
        cur = (cur + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)

    remaining_hours = float(hours)
    while remaining_hours > 0:
        if cur.weekday() < 5:  # Ngày làm việc (Thứ Hai - Thứ Sáu)
            hours_today = 24.0 - cur.hour - (cur.minute / 60.0) - (cur.second / 3600.0)
            if remaining_hours <= hours_today:
                cur = cur + timedelta(hours=remaining_hours)
                remaining_hours = 0
            else:
                remaining_hours -= hours_today
                # Chuyển sang 00:00 ngày tiếp theo
                cur = (cur + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            # Cuối tuần -> nhảy sang 00:00 Thứ Hai
            days_to_add = 2 if cur.weekday() == 5 else 1
            cur = (cur + timedelta(days=days_to_add)).replace(hour=0, minute=0, second=0, microsecond=0)

    return cur

def calculate_review_due_at(assigned_at: datetime, due_hours: float = 48.0) -> datetime:
    """Tính thời điểm hết hạn nộp bài của Expert theo SLA 48h làm việc."""
    return add_business_hours(assigned_at, due_hours)

def calculate_decline_deadline(assigned_at: datetime, decline_hours: float = 2.0) -> datetime:
    """Tính mốc thời gian tối đa Expert được phép từ chối nhận bài (FR-39: 2h làm việc)."""
    return add_business_hours(assigned_at, decline_hours)

def is_within_decline_window(assigned_at: datetime, decline_hours: float = 2.0, now_dt: datetime = None) -> bool:
    """Kiểm tra thời điểm hiện tại có còn trong khung giờ được từ chối bài không."""
    if now_dt is None:
        now_dt = datetime.now(TZ_VN)
    elif now_dt.tzinfo is None:
        now_dt = now_dt.replace(tzinfo=TZ_VN)
    else:
        now_dt = now_dt.astimezone(TZ_VN)

    deadline = calculate_decline_deadline(assigned_at, decline_hours)
    return now_dt <= deadline
