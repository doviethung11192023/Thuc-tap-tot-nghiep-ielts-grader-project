"""Danh mục cố định của cấu hình AI ở Core: 8 bước chấm, nhà cung cấp key, khoảng giá trị (data-model §2, FR-036).
Khớp ai_step_registry của AI engine (service riêng nên không import chéo); engine là nguồn chân lý của việc áp ghi đè."""

# khoá bước -> (nhãn tiếng Việt, tên prompt)
STEPS: dict[str, tuple[str, list[str]]] = {
    "writing_criteria": ("Writing: chấm từng tiêu chí", [
        "writing/task1/ta", "writing/task2/ta", "writing/common/cc", "writing/common/lr", "writing/common/gra"]),
    "writing_task2_grade": ("Writing Task 2: chấm một lượt", ["writing/task2/grade"]),
    "writing_rewrite": ("Writing: viết lại bài", ["writing/task1/rewrite", "writing/task2/rewrite"]),
    "writing_vision": ("Writing Task 1: đọc biểu đồ", ["writing/task1/chart", "writing/task1/answer-key"]),
    "writing_classify": ("Writing: phân loại đề", ["writing/task1/classify", "writing/task2/classify"]),
    "writing_keycheck": ("Writing Task 1: kiểm đáp án", ["writing/task1/keycheck"]),
    "writing_material": ("Writing: dàn ý và bài mẫu", ["writing/common/outline", "writing/common/sample"]),
    "speaking_grading": ("Speaking: chấm bài", [
        "speaking/common/fc", "speaking/common/lr", "speaking/common/gra", "speaking/common/pr",
        "speaking/common/overall", "speaking/part1/feedback", "speaking/part2/feedback",
        "speaking/part3/feedback"]),
}

# nhà cung cấp key -> (nhãn, loại gọi thử của engine)
PROVIDERS: dict[str, tuple[str, str]] = {
    "dashscope": ("DashScope (LLM)", "llm"),
    "typesafe": ("TypeSafe (Jev)", "jev"),
}

# (nhỏ nhất, lớn nhất, nhãn) theo FR-036
RANGES: dict[str, tuple[float, float, str]] = {
    "temperature": (0, 2, "temperature"),
    "max_tokens": (1, 16000, "max_tokens"),
    "llm.timeout_seconds": (10, 600, "timeout LLM"),
    "jev.timeout_seconds": (1, 30, "timeout Jev"),
}

# Khoá system_settings do trang Service AI hoặc giám sát quản lý, ẩn khỏi trình sửa JSON chung
RUNTIME_CONFIG_KEY = "ai_runtime_config"


# Đúng các khoá spec 008 thêm; KHÔNG dùng tiền tố "ai_" vì DB có khoá khác như ai_tutor_config vẫn sửa ở trang Cài đặt
AI_MANAGED_SETTING_KEYS = frozenset({"ai_model_prices", "ai_monthly_budget_usd", RUNTIME_CONFIG_KEY, "trace_view_days",
                                     "ai_model_price_sync"})


def is_ai_managed_setting(key: str) -> bool:
    return key in AI_MANAGED_SETTING_KEYS
