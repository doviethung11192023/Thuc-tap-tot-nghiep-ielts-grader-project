"""Admin: danh sách, tạo, sửa, đổi trạng thái, xoá đề thi (UC-21, UC-36)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.responses import ok, created
from app.core.student_content_cache import StudentContentMutationRoute
from app.core.domain_errors import DomainError
from app.core.security import User, require_admin
from app.schemas.exam_content import AllowedMode, ContentStatus, SkillType, TestCreate, TestStatusUpdate, TestUpdate
from app.services.cms import cms_clone, cms_tests

router = APIRouter(route_class=StudentContentMutationRoute)


def _plain(data: dict) -> dict:
    return {k: v.value if hasattr(v, "value") else v for k, v in data.items()}


@router.get("/tests")
def list_tests(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100),
                     skill: Optional[SkillType] = None,
                     status_filter: Optional[ContentStatus] = Query(None, alias="status"),
                     allowed_mode: Optional[AllowedMode] = None, test_set_id: Optional[str] = None,
                     difficulty: Optional[str] = None, sort_by: Optional[str] = Query("newest"),
                     search: Optional[str] = None, test_format: Optional[str] = None,
                     current_user: User = Depends(require_admin)):
    """Lọc theo kỹ năng, trạng thái, mode, bộ đề, độ khó, định dạng (full/exercise)."""
    filters = _plain({"skill": skill, "status": status_filter, "allowed_mode": allowed_mode,
                      "test_set_id": test_set_id, "difficulty": difficulty})
    return ok(cms_tests.list_tests(page, limit, filters, sort_by, search, test_format))


@router.post("/tests", status_code=status.HTTP_201_CREATED)
def create_test(test_data: TestCreate, current_user: User = Depends(require_admin)):
    data = cms_tests.create_test(current_user.id, _plain(test_data.model_dump()))
    return created(data, message="Tạo bài thi thành công")


@router.get("/tests/{test_id}")
def get_test_detail(test_id: str, current_user: User = Depends(require_admin)):
    """Đề + section + câu hỏi + đáp án (chỉ Admin)."""
    data = cms_tests.test_tree(test_id)
    if not data:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    return ok(data)


@router.put("/tests/{test_id}")
def update_test(test_id: str, update_data: TestUpdate, current_user: User = Depends(require_admin)):
    data = cms_tests.update_test(current_user.id, test_id, _plain(update_data.model_dump(exclude_unset=True)))
    return ok(data, message="Cập nhật bài thi thành công")


@router.patch("/tests/{test_id}/status")
def update_test_status(test_id: str, status_data: TestStatusUpdate, current_user: User = Depends(require_admin)):
    """draft → published (kiểm tra nội dung trước) → archived."""
    data = cms_tests.set_status(current_user.id, test_id, status_data.status.value)
    return ok(data, message=f"Đã cập nhật trạng thái sang {data['status']}")


@router.delete("/tests/{test_id}")
def delete_test(test_id: str, current_user: User = Depends(require_admin)):
    """Chỉ xoá được đề nháp chưa có bài làm; đề đã dùng thì lưu trữ (archive)."""
    cms_tests.delete_test(current_user.id, test_id)
    return ok(message="Xóa bài thi thành công")


@router.post("/tests/{test_id}/clone-draft", status_code=status.HTTP_201_CREATED)
def clone_test_draft(test_id: str, current_user: User = Depends(require_admin)):
    """Nhân bản đề published/archived sang bản nháp mới để chỉnh sửa an toàn (BR-10)."""
    data = cms_clone.clone_test_to_draft(current_user.id, test_id)
    return created(data, message="Đã tạo bản nháp mới từ đề thi")


class BulkStatusRequest(BaseModel):
    test_ids: List[str]
    status: ContentStatus


@router.post("/tests/bulk-status")
def bulk_update_status(data: BulkStatusRequest, current_user: User = Depends(require_admin)):
    if not data.test_ids:
        raise HTTPException(status_code=400, detail="Danh sách bài thi trống")
    results, errors = [], []
    for tid in data.test_ids:
        try:
            results.append(cms_tests.set_status(current_user.id, tid, data.status.value))
        except DomainError as e:
            errors.append({"test_id": tid, "detail": e.detail})
    return {**ok(results, message=f"Đã cập nhật {len(results)}/{len(data.test_ids)} bài thi"), "errors": errors}
