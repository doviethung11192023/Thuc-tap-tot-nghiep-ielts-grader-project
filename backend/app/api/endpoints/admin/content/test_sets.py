from fastapi import APIRouter, Depends, status
from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from app.api.responses import created, ok
from app.core.student_content_cache import StudentContentMutationRoute
from app.core.security import require_admin, User
from app.services.cms import test_sets_service

router = APIRouter(route_class=StudentContentMutationRoute)

class TestSetCreatePayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)

class TestSetUpdatePayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)

class TestSetStatusPayload(BaseModel):
    status: Literal["draft", "published", "archived"]

class BulkAssignSetPayload(BaseModel):
    test_ids: List[str]
    test_set_id: Optional[str] = None

@router.get("/test-sets")
def list_admin_test_sets(current_user: User = Depends(require_admin)):
    """Danh sách tất cả bộ đề thi trong hệ thống kèm thống kê bài thi và kỹ năng."""
    return ok(test_sets_service.list_test_sets())

@router.post("/test-sets", status_code=status.HTTP_201_CREATED)
def create_admin_test_set(
    payload: TestSetCreatePayload,
    current_user: User = Depends(require_admin)
):
    """Tạo mới một bộ đề thi."""
    return created(test_sets_service.create_test_set(payload.name), message="Tạo bộ đề thi thành công")

@router.put("/test-sets/{set_id}")
def update_admin_test_set(
    set_id: str,
    payload: TestSetUpdatePayload,
    current_user: User = Depends(require_admin)
):
    """Cập nhật tên bộ đề thi."""
    return ok(test_sets_service.rename_test_set(set_id, payload.name), message="Cập nhật bộ đề thi thành công")


@router.patch("/test-sets/{set_id}/status")
def update_admin_test_set_status(
    set_id: str,
    payload: TestSetStatusPayload,
    current_user: User = Depends(require_admin),
):
    """Đổi trạng thái bộ đề; khi xuất bản bắt buộc phải có đủ 4 kỹ năng đã xuất bản."""
    row = test_sets_service.change_test_set_status(set_id, payload.status, current_user.id)
    return ok(row, message="Cập nhật trạng thái bộ đề thành công")

@router.delete("/test-sets/{set_id}")
def delete_admin_test_set(
    set_id: str,
    current_user: User = Depends(require_admin)
):
    """Xóa bộ đề thi và tự động gỡ liên kết các bài thi an toàn."""
    test_sets_service.delete_test_set(set_id)
    return ok(message="Xóa bộ đề thành công. Các bài thi đã được chuyển về dạng độc lập.")

@router.post("/tests/bulk-assign-set")
def bulk_assign_tests_to_set(
    payload: BulkAssignSetPayload,
    current_user: User = Depends(require_admin)
):
    """Gán hoặc gỡ hàng loạt bài thi vào/khỏi một bộ đề."""
    result = test_sets_service.bulk_assign_tests(payload.test_ids, payload.test_set_id)
    action_label = "Gán bài thi vào bộ đề" if payload.test_set_id else "Gỡ bài thi khỏi bộ đề"
    return ok(result, message=f"{action_label} thành công ({result['updated_count']} bài thi)")
