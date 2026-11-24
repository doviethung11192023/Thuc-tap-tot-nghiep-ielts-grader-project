"""Giám sát AI cho Admin (spec 008): lượt chấm, cảnh báo, chạy lại, chi phí, giá, chênh lệch AI–Expert, audit log."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.concurrency import run_in_threadpool

from app.api.responses import ok
from app.core.security import User, require_admin
from app.schemas.ai_monitoring import AiPricingUpdate, RegradeRequest
from app.services.ai_monitoring import (
    admin_alerts, ai_expert_gap, ai_expert_gap_case_detail, ai_expert_gap_cases, ai_pricing_admin, ai_usage_report,
    audit_log_queries, grading_run_queries, model_price_sync, regrade_service,
)

router = APIRouter()
DATE = r"^\d{4}-\d{2}-\d{2}$"


def _ids(body: RegradeRequest) -> list[str]:
    return [str(attempt_id) for attempt_id in body.attempt_ids]




@router.get("/grading-runs")
async def list_grading_runs(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="running | done | failed | stuck | attention"),
    skill: Optional[str] = Query(None, pattern="^(writing|speaking)$"),
    date_from: Optional[str] = Query(None, pattern=DATE), date_to: Optional[str] = Query(None, pattern=DATE),
    model: Optional[str] = None, prompt_name: Optional[str] = None, prompt_version: Optional[str] = None,
    attempt_id: Optional[UUID] = None, current_user: User = Depends(require_admin),
):
    """Lượt chấm AI mới nhất trước, lọc theo trạng thái (gồm treo, cần chú ý), kỹ năng, ngày VN, model, prompt."""
    filters = {"status": status, "skill": skill, "date_from": date_from, "date_to": date_to, "model": model,
               "prompt_name": prompt_name, "prompt_version": prompt_version,
               "attempt_id": str(attempt_id) if attempt_id else None}
    return ok(await run_in_threadpool(grading_run_queries.list_runs, page, limit, filters), message="Success")


@router.get("/grading-runs/{run_id}")
async def get_grading_run(run_id: UUID, current_user: User = Depends(require_admin)):
    return ok(await run_in_threadpool(grading_run_queries.run_detail, str(run_id)), message="Success")


@router.get("/alerts")
async def get_alerts(current_user: User = Depends(require_admin)):
    """Badge dashboard: attempt chấm lỗi, lượt treo, ngân sách."""
    return ok(await run_in_threadpool(admin_alerts.alert_summary), message="Success")


@router.post("/regrade/preview")
async def preview_regrade(body: RegradeRequest, current_user: User = Depends(require_admin)):
    """Xem trước đợt chạy lại: bài chạy được, bài bị bỏ qua kèm lý do, chi phí ước tính. Không ghi gì."""
    return ok(await run_in_threadpool(regrade_service.preview, _ids(body)), message="Success")


@router.post("/regrade")
async def regrade(body: RegradeRequest, request: Request, current_user: User = Depends(require_admin)):
    """Chạy lại chấm AI (tối đa 50 bài): evaluation mới, qua hàng đợi chấm bình thường, mỗi bài một dòng audit."""
    data = await regrade_service.run_regrade(current_user.id, _ids(body), request.app.state.redis)
    return ok(data, message="Success")


@router.get("/ai-usage")
async def get_ai_usage(month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
                       group_by: str = Query("day", pattern="^(day|model|skill)$"),
                       current_user: User = Depends(require_admin)):
    return ok(await run_in_threadpool(ai_usage_report.usage_report, month, group_by), message="Success")


@router.get("/ai-pricing")
async def get_ai_pricing(current_user: User = Depends(require_admin)):
    return ok(await run_in_threadpool(ai_pricing_admin.get_pricing), message="Success")


@router.put("/ai-pricing")
async def put_ai_pricing(body: AiPricingUpdate, current_user: User = Depends(require_admin)):
    """Sửa bảng giá model và/hoặc ngân sách tháng; không bỏ được model đang được bước AI dùng. Không gọi thử."""
    fields = body.model_fields_set
    data = await run_in_threadpool(lambda: ai_pricing_admin.update_pricing(
        current_user.id, body.prices, body.budget_usd, has_prices="prices" in fields, has_budget="budget_usd" in fields))
    return ok(data, message="Success")


@router.post("/ai-pricing/sync")
async def sync_ai_pricing(current_user: User = Depends(require_admin)):
    """Kiểm ngay giá model với trang giá của nhà cung cấp (cron cũng chạy mỗi ngày); giá đổi thì lưu và ghi audit."""
    await run_in_threadpool(model_price_sync.sync_model_prices, current_user.id)
    return ok(await run_in_threadpool(ai_pricing_admin.get_pricing), message="Success")


@router.get("/ai-expert-gap")
async def get_ai_expert_gap(days: int = Query(30, ge=1, le=365),
                            group_by: str = Query("none", pattern="^(none|prompt_version|model|task_type|band_range)$"),
                            current_user: User = Depends(require_admin)):
    return ok(await run_in_threadpool(ai_expert_gap.gap_overview, days, group_by), message="Success")


@router.get("/ai-expert-gap/cases")
async def list_ai_expert_gap_cases(
    days: int = Query(30, ge=1, le=365), skill: Optional[str] = Query(None, pattern="^(writing|speaking)$"),
    criterion: str = Query("overall"), min_abs: float = Query(1.0, ge=0, le=9),
    direction: str = Query("all", pattern="^(all|ai_higher|ai_lower)$"),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), current_user: User = Depends(require_admin),
):
    return ok(await run_in_threadpool(ai_expert_gap_cases.list_cases, days, skill, criterion, min_abs, direction,
                                       page, limit), message="Success")


@router.get("/ai-expert-gap/cases/{attempt_id}")
async def get_ai_expert_gap_case(attempt_id: UUID, ai_evaluation_id: Optional[UUID] = None,
                                 current_user: User = Depends(require_admin)):
    return ok(await run_in_threadpool(ai_expert_gap_case_detail.case_detail, str(attempt_id),
                                       str(ai_evaluation_id) if ai_evaluation_id else None), message="Success")


@router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    actor: Optional[str] = Query(None, description="system hoặc id của Admin"),
    action: Optional[str] = None, entity: Optional[str] = None,
    date_from: Optional[str] = Query(None, pattern=DATE), date_to: Optional[str] = Query(None, pattern=DATE),
    current_user: User = Depends(require_admin),
):
    return ok(await run_in_threadpool(audit_log_queries.list_audit_logs, page, limit, actor, action, entity,
                                       date_from, date_to), message="Success")


@router.get("/audit-logs/{log_id}")
async def get_audit_log(log_id: UUID, current_user: User = Depends(require_admin)):
    return ok(await run_in_threadpool(audit_log_queries.get_audit_log, str(log_id)), message="Success")
