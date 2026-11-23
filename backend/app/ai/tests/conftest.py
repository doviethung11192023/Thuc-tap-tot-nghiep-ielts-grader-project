"""Make the AI engine root (backend/app/ai) importable as top-level packages."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


import pytest  # noqa: E402


@pytest.fixture(autouse=True)
def _no_core_api_for_runtime_config():
    """Tests never call the Core API: the process-wide runtime-config client returns an empty config."""
    from services.runtime_config import runtime_config_client as rcc

    previous = rcc.get_runtime_config_client()
    rcc.set_runtime_config_client(rcc.RuntimeConfigClient(fetcher=lambda: {}))
    yield
    rcc.set_runtime_config_client(previous)
