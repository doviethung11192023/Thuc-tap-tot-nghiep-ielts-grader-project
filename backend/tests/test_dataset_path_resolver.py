"""Thư mục dataset mặc định phải là dataset_clean/ ở gốc repo. Đường dẫn tính theo vị trí file, nên dời file là lệch."""
import importlib
from pathlib import Path


def test_default_dataset_root_is_dataset_clean_at_repo_root(monkeypatch):
    monkeypatch.delenv("DATASET_ROOT", raising=False)
    from app.services.datasets import dataset_path_resolver
    module = importlib.reload(dataset_path_resolver)
    repo_root = Path(__file__).resolve().parents[2]
    assert Path(module.DEFAULT_DATASET_ROOT) == repo_root / "dataset_clean"
