"""DB giả cho test giám sát AI: thêm so sánh, sắp xếp, phân trang, count, lọc theo đường dẫn lồng nhau và `or`.

Dòng có thể chứa sẵn dữ liệu nhúng (như PostgREST trả `evaluations: {...}`); cột "a.b.c" đi qua các dict lồng nhau.
"""
from datetime import datetime
from types import SimpleNamespace
from typing import Any

from fake_supabase import FakeQuery, FakeSupabase

ADMIN_ID = "aaaaaaaa-0000-0000-0000-000000000001"


def get_path(row: dict[str, Any], path: str) -> Any:
    value: Any = row
    for part in path.replace("->>", ".").split("."):
        value = value.get(part) if isinstance(value, dict) else None
    return value


def _split_top(expr: str) -> list[str]:
    parts, depth, current = [], 0, ""
    for ch in expr:
        depth += ch == "("
        depth -= ch == ")"
        if ch == "," and depth == 0:
            parts.append(current)
            current = ""
        else:
            current += ch
    return parts + [current]


def _term(term: str):
    """Một điều kiện của `or`: and(a,b) hoặc cột.toán_tử.giá_trị."""
    if term.startswith("and(") and term.endswith(")"):
        inner = [_term(t) for t in _split_top(term[4:-1])]
        return lambda r: all(f(r) for f in inner)
    column, op, value = term.split(".", 2)
    if op == "in":
        values = value.strip("()").split(",")
        return lambda r: str(get_path(r, column)) in values
    if op == "not":
        return lambda r: get_path(r, column) is not None
    return lambda r: _compare(get_path(r, column), op, value)


def _instant(value: Any) -> Any:
    """Chuỗi ISO có múi giờ → datetime để so theo thời điểm (Postgres so timestamptz, không so chuỗi)."""
    if isinstance(value, str) and len(value) > 10 and value[4] == "-" and "T" in value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    return value


def _compare(actual: Any, op: str, expected: Any) -> bool:
    if op == "is":
        return actual is None
    if actual is None:
        return False
    if isinstance(actual, (int, float)) and not isinstance(actual, bool):
        expected = float(expected)
    elif isinstance(actual, str):
        actual, expected = _instant(actual), _instant(expected)
    else:
        actual = str(actual)
    return {"eq": actual == expected, "lt": actual < expected, "lte": actual <= expected,
            "gt": actual > expected, "gte": actual >= expected}[op]


class RichQuery(FakeQuery):
    def __init__(self, rows):
        super().__init__(rows)
        self.sort: list[tuple[str, bool]] = []
        self.window: tuple[int, int] | None = None
        self.count_requested = False

    def select(self, *_args, count=None, **_kwargs):
        self.count_requested = count is not None
        return self

    def _add(self, column, op, value):
        self.filters.append(lambda r: _compare(get_path(r, column), op, value))
        return self

    def eq(self, column, value):
        # `->>` của PostgREST luôn trả text nên so bằng chuỗi
        as_text = "->>" in column
        self.filters.append(lambda r: (str(get_path(r, column)) == str(value)) if as_text
                            else get_path(r, column) == value)
        return self

    def neq(self, column, value):
        self.filters.append(lambda r: get_path(r, column) != value)
        return self

    def in_(self, column, values):
        self.filters.append(lambda r: get_path(r, column) in values)
        return self

    def is_(self, column, _value):
        negate, self._negate = self._negate, False
        self.filters.append((lambda r: get_path(r, column) is not None) if negate
                            else (lambda r: get_path(r, column) is None))
        return self

    def lt(self, column, value):
        return self._add(column, "lt", value)

    def lte(self, column, value):
        return self._add(column, "lte", value)

    def gt(self, column, value):
        return self._add(column, "gt", value)

    def gte(self, column, value):
        return self._add(column, "gte", value)

    def or_(self, expression):
        terms = [_term(t) for t in _split_top(expression)]
        self.filters.append(lambda r: any(f(r) for f in terms))
        return self

    def order(self, column, desc=False, **_kwargs):
        self.sort.append((column, desc))
        return self

    def range(self, start, end):
        self.window = (start, end)
        return self

    def limit(self, n):
        self.window = (0, n - 1)
        return self

    def execute(self):
        if self.action != "select":
            return super().execute()
        rows = [dict(r) for r in self._matched()]
        for column, desc in reversed(self.sort):
            rows.sort(key=lambda r: (get_path(r, column) is None, _instant(get_path(r, column))), reverse=desc)
        total = len(rows)
        if self.window:
            rows = rows[self.window[0]: self.window[1] + 1]
        return SimpleNamespace(data=rows, count=total if self.count_requested else None)


class RichFakeSupabase(FakeSupabase):
    def table(self, name: str) -> RichQuery:
        return RichQuery(self.tables.setdefault(name, []))
