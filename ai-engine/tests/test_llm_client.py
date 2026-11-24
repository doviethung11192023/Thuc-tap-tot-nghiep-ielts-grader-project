from settings.config import get_settings
from services.llm.llm_client import llm_extra_body, strip_markdown_fence


def test_strip_markdown_fence():
    assert strip_markdown_fence('```json\n{"a": 1}\n```') == '{"a": 1}'
    assert strip_markdown_fence('```\n{"a": 1}\n```') == '{"a": 1}'
    assert strip_markdown_fence(' {"a": 1} ') == '{"a": 1}'


def test_extra_body_only_for_dashscope(monkeypatch):
    monkeypatch.setenv("DEFAULT_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
    get_settings.cache_clear()
    assert llm_extra_body() == {"enable_thinking": False}

    monkeypatch.setenv("DEFAULT_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
    get_settings.cache_clear()
    assert llm_extra_body() == {}
    monkeypatch.delenv("DEFAULT_BASE_URL")
    get_settings.cache_clear()


def test_trace_options_names_the_call_after_the_langfuse_prompt():
    """Trace phải cho biết lần gọi nào là prompt nào (spec 008 US1); không có prompt thật thì không thêm kwargs."""
    from types import SimpleNamespace
    from services.llm.llm_client import trace_options
    prompt = SimpleNamespace(name="writing/common/cc", version=2)
    assert trace_options(SimpleNamespace(langfuse_prompt=prompt)) == {"name": "writing/common/cc", "langfuse_prompt": prompt}
    assert trace_options(SimpleNamespace(langfuse_prompt=prompt), name="cc") ["name"] == "cc"
    assert trace_options(SimpleNamespace(langfuse_prompt=None)) == {}
    assert trace_options(SimpleNamespace(langfuse_prompt=object())) == {}
