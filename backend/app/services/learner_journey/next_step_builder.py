"""
Nối reader với luật: thẻ "Bước tiếp theo" và band hiện tại cho dashboard (spec 005, ADR-23).
Tính lại mỗi lần xem, không lưu, không cache theo Learner (FR-019, SC-005). Không gọi LLM.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any

from . import journey_data_readers as readers
from .journey_constants import EXAM_SOON_DAYS
from .next_step_rules import JourneyInputs, build_bands_and_exam, build_next_step, goal_is_set


def _criterion_and_task_rows(attempts: list[dict[str, Any]]) -> tuple[list[dict], list[dict]]:
    rows = readers.official_criterion_rows(attempts)
    return rows, readers.writing_task_rows(rows)


def compute_next_step(user_id: str) -> dict[str, Any]:
    # Mỗi lượt đọc Supabase ~0,2–0,4 s do độ trễ mạng: chạy song song theo 2 đợt để giữ dashboard < 2 s (SC-003)
    with ThreadPoolExecutor(max_workers=4) as pool:
        goal_f = pool.submit(readers.goal_row, user_id)
        attempts_f = pool.submit(readers.learner_attempts, user_id)
        catalog_f = pool.submit(readers.published_catalog)
        goal = goal_f.result()
        if not goal_is_set(goal):
            return {"goal_set": False}
        attempts = attempts_f.result()
        answers_f = pool.submit(readers.lr_answers, attempts)
        criterion_f = pool.submit(_criterion_and_task_rows, attempts)
        data = JourneyInputs(goal=goal, attempts=attempts, now=datetime.now(timezone.utc),
                             difficulty_loader=readers.difficulties)
        _, exam = build_bands_and_exam(data)
        if exam["days_left"] is not None and exam["days_left"] <= EXAM_SOON_DAYS:
            data.mock_pool = readers.mock_pool(user_id)      # chỉ cần khi gần ngày thi
        data.catalog, data.lr_answers = catalog_f.result(), answers_f.result()
        data.criterion_rows, data.writing_task_rows = criterion_f.result()
    return build_next_step(data)


def compute_current_bands(user_id: str, attempts: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """{current_bands, exam, goal_set} cho overview dashboard (FR-001…006)."""
    goal = readers.goal_row(user_id)
    data = JourneyInputs(goal=goal, attempts=attempts if attempts is not None else readers.learner_attempts(user_id),
                         now=datetime.now(timezone.utc))
    bands, exam = build_bands_and_exam(data)
    return {"current_bands": bands, "exam": exam, "goal_set": goal_is_set(goal)}
