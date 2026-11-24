"""Bảng quy đổi điểm thô (Reading/Listening) sang band IELTS: CRUD và luật kiểm tra khoảng điểm.

Bảng có khoá (skill, raw_min) nên API dùng id dạng "skill:raw_min". Mọi thay đổi đều ghi audit.
"""
from typing import Optional

from app.core.domain_errors import ConflictError, DomainError, InvalidRequestError, NotFoundError
from app.db.supabase import db
from app.schemas.exam_content import SkillType
from app.schemas.system_settings import BandConversionCreate
from app.services.admin.staff_accounts import write_audit   # sửa bảng quy đổi phải ghi audit


def _with_id(row: dict) -> dict:
    """band_conversions có khoá (skill, raw_min); API dùng id "skill:raw_min"."""
    return {**row, "id": f"{row['skill']}:{row['raw_min']}"}


def _band_error(e: Exception) -> DomainError:
    """Lỗi DB khi ghi bảng quy đổi: khoảng chồng lấn (ràng buộc 15) khác với band sai bước 0.5 (BR-01)."""
    msg = str(e)
    if "exclusion" in msg or "conflicting key" in msg or "overlap" in msg or "duplicate key" in msg:
        return ConflictError("Khoảng điểm đã tồn tại hoặc bị chồng lấn với khoảng khác cùng kỹ năng")
    if "band" in msg and "check constraint" in msg:
        return InvalidRequestError("Band phải là bội số của 0.5 từ 0 đến 9 (BR-01)")
    return InvalidRequestError(msg[:200])


def _parse_id(item_id: str) -> tuple:
    try:
        skill_key, raw_min = item_id.split(":")
        return skill_key, int(raw_min)
    except ValueError:
        raise InvalidRequestError("Mã quy đổi không hợp lệ (dạng skill:raw_min)")


def _payload(data: BandConversionCreate) -> dict:
    return {
        "skill": data.skill.value,
        "raw_min": data.raw_min,
        "raw_max": data.raw_max,
        "band": data.band,
    }


def list_band_conversions(skill: Optional[SkillType]) -> list[dict]:
    query = db().table("band_conversions").select("skill, raw_min, raw_max, band")
    if skill:
        query = query.eq("skill", skill.value)
    res = query.order("skill").order("raw_min", desc=True).execute()
    return [_with_id(r) for r in res.data or []]


def create_band_conversion(data: BandConversionCreate, admin_id: str) -> dict:
    if data.skill not in [SkillType.LISTENING, SkillType.READING]:
        raise InvalidRequestError("Quy đổi điểm thô chỉ áp dụng cho Reading và Listening")
    if data.raw_min > data.raw_max:
        raise InvalidRequestError("raw_min phải nhỏ hơn hoặc bằng raw_max")

    payload = _payload(data)
    try:
        res = db().table("band_conversions").insert(payload).execute()
    except Exception as e:
        raise _band_error(e)
    write_audit(admin_id, "create_band_conversion", "band_conversions", _with_id(res.data[0])["id"], after=payload)
    return _with_id(res.data[0])


def update_band_conversion(item_id: str, data: BandConversionCreate, admin_id: str) -> dict:
    if data.raw_min > data.raw_max:
        raise InvalidRequestError("raw_min phải nhỏ hơn hoặc bằng raw_max")
    payload = _payload(data)
    skill_key, raw_min = _parse_id(item_id)
    before = db().table("band_conversions").select("skill, raw_min, raw_max, band") \
        .eq("skill", skill_key).eq("raw_min", raw_min).execute().data
    try:
        res = db().table("band_conversions").update(payload).eq("skill", skill_key).eq("raw_min", raw_min).execute()
    except Exception as e:
        raise _band_error(e)
    if not res.data:
        raise NotFoundError("Bản ghi quy đổi không tồn tại")
    write_audit(admin_id, "update_band_conversion", "band_conversions", item_id,
                before=before[0] if before else None, after=payload)
    return _with_id(res.data[0])


def delete_band_conversion(item_id: str, admin_id: str) -> None:
    skill_key, raw_min = _parse_id(item_id)
    res = db().table("band_conversions").delete().eq("skill", skill_key).eq("raw_min", raw_min).execute()
    if not res.data:
        raise NotFoundError("Bản ghi quy đổi không tồn tại")
    write_audit(admin_id, "delete_band_conversion", "band_conversions", item_id, before=res.data[0])
