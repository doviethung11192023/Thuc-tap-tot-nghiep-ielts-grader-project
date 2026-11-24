"""Bộ đề thi (test_sets): liệt kê kèm thống kê, tạo/đổi tên/đổi trạng thái/xoá và gán đề hàng loạt.

Bộ đề Mock cần đủ 4 kỹ năng đã xuất bản mới được publish (FR-36), nên luật đó nằm ở đây chứ không ở route.
"""
import uuid
from typing import Any, Dict, List, Optional

from app.core.domain_errors import InternalFailureError, InvalidRequestError, NotFoundError
from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit
from app.services.cms.cms_tests import db_error

REQUIRED_MOCK_SKILLS = ("listening", "reading", "writing", "speaking")


def _require_uuid(value: str, message: str = "Mã bộ đề thi không hợp lệ (UUID)") -> None:
    try:
        uuid.UUID(value)
    except ValueError:
        raise InvalidRequestError(message)


def list_test_sets() -> dict[str, Any]:
    """Mỗi bộ đề kèm số đề, số đề đã xuất bản, kỹ năng còn thiếu để publish thành bộ Mock hoàn chỉnh."""
    sets_res = db().table("test_sets").select("*").order("created_at", desc=True).execute()
    test_sets = sets_res.data or []

    tests_res = db().table("tests").select("id, skill, status, test_set_id").execute()
    all_tests = tests_res.data or []

    tests_by_set: Dict[str, List[Dict[str, Any]]] = {}
    standalone_count = 0
    for t in all_tests:
        sid = t.get("test_set_id")
        if sid:
            tests_by_set.setdefault(sid, []).append(t)
        else:
            standalone_count += 1

    result = []
    for s in test_sets:
        sid = s["id"]
        assigned = tests_by_set.get(sid, [])
        skills = sorted(list({str(t.get("skill", "")).capitalize() for t in assigned if t.get("skill")}))
        published_skills = {str(t.get("skill", "")).lower() for t in assigned if t.get("status") == "published" and t.get("skill")}
        missing_skills = [sk.capitalize() for sk in REQUIRED_MOCK_SKILLS if sk not in published_skills]
        published_count = sum(1 for t in assigned if t.get("status") == "published")
        result.append({
            "id": sid,
            "name": s["name"],
            "status": s.get("status", "published"),
            "created_at": s.get("created_at"),
            "total_tests": len(assigned),
            "published_tests": published_count,
            "skills": skills,
            "missing_skills": missing_skills,
            "is_complete_mock": len(missing_skills) == 0,
        })

    return {"items": result, "total": len(result), "standalone_tests_count": standalone_count}


def create_test_set(name: str) -> dict:
    name_clean = name.strip()
    existing = db().table("test_sets").select("id").ilike("name", name_clean).execute()
    if existing.data:
        raise InvalidRequestError(f"Bộ đề thi '{name_clean}' đã tồn tại")

    insert_data = {"name": name_clean, "status": "published"}   # bộ đề Mock: tối đa 1 đề / kỹ năng (FR-36)
    res = db().table("test_sets").insert(insert_data).execute()
    if not res.data:
        raise InternalFailureError("Không thể tạo bộ đề thi trong database")
    return res.data[0]


def rename_test_set(set_id: str, name: str) -> dict:
    _require_uuid(set_id)
    res = db().table("test_sets").update({"name": name.strip()}).eq("id", set_id).execute()
    if not res.data:
        raise NotFoundError("Không tìm thấy bộ đề thi để cập nhật")
    return res.data[0]


def change_test_set_status(set_id: str, new_status: str, admin_id: str) -> dict:
    """Publish chỉ được khi bộ đề đã có đủ 4 kỹ năng ở trạng thái đã xuất bản."""
    _require_uuid(set_id)

    if new_status == "published":
        assigned = (
            db().table("tests").select("skill, status").eq("test_set_id", set_id).execute().data or []
        )
        pub_skills = {str(t.get("skill", "")).lower() for t in assigned if t.get("status") == "published"}
        missing = [sk.capitalize() for sk in REQUIRED_MOCK_SKILLS if sk not in pub_skills]
        if missing:
            raise InvalidRequestError(
                f"Bộ đề Mock cần đủ 4 kỹ năng đã xuất bản trước khi publish (thiếu: {', '.join(missing)})"
            )

    res = db().table("test_sets").update({"status": new_status}).eq("id", set_id).execute()
    if not res.data:
        raise NotFoundError("Không tìm thấy bộ đề thi")
    write_audit(admin_id, f"{new_status}_test_set", "test_sets", set_id, after={"status": new_status})
    return res.data[0]


def delete_test_set(set_id: str) -> None:
    """Gỡ liên kết các đề khỏi bộ rồi xoá bộ; đề đã lưu trữ bị trigger khoá nên không gỡ được."""
    _require_uuid(set_id)

    # 1. Unlink tests (đề archived bị trigger BR-10 khoá, không gỡ được khỏi bộ)
    try:
        db().table("tests").update({"test_set_id": None}).eq("test_set_id", set_id).execute()
    except Exception as e:
        err = db_error(e)
        if err.status_code == 409:
            err.detail = "Bộ đề còn chứa đề đã lưu trữ nên không gỡ được khỏi bộ để xoá (BR-10)"
        raise err

    # 2. Delete set
    res = db().table("test_sets").delete().eq("id", set_id).execute()
    if not res.data:
        raise NotFoundError("Không tìm thấy bộ đề thi để xóa")


def bulk_assign_tests(test_ids: List[str], target_set_id: Optional[str]) -> dict[str, Any]:
    """Gán các đề vào bộ (hoặc gỡ khỏi bộ khi target_set_id rỗng); trả số đề thực sự được cập nhật."""
    if not test_ids:
        raise InvalidRequestError("Danh sách bài thi không được để trống")
    if target_set_id:
        _require_uuid(target_set_id, "Mã bộ đề đích không hợp lệ")

    updated_count = 0
    for tid in test_ids:
        try:
            u_res = db().table("tests").update({"test_set_id": target_set_id}).eq("id", tid).execute()
        except Exception as e:
            raise db_error(e)
        if u_res.data:
            updated_count += len(u_res.data)
    return {"updated_count": updated_count, "test_set_id": target_set_id}
