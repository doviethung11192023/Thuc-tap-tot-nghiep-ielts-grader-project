import os
from pathlib import Path
from typing import Optional, Tuple

# Mặc định: dataset_clean/ ở gốc repo; đổi bằng biến môi trường DATASET_ROOT
DEFAULT_DATASET_ROOT = os.environ.get("DATASET_ROOT") or str(Path(__file__).resolve().parents[3] / "dataset_clean")

def resolve_dataset_paths(root_path: Optional[str] = None) -> Tuple[Path, Path, Path]:
    """
    Tự động chuẩn hóa và phát hiện thư mục dataset clean hoặc crawled cũ.
    Trả về: (root_dir, de_bai_dir, dap_an_dir)
    """
    raw = Path(root_path or DEFAULT_DATASET_ROOT)

    # 1. Phát hiện thư mục con lồng nhau dataset_clean nếu có
    if (raw / "dataset_clean").exists():
        raw = raw / "dataset_clean"

    # 2. Phát hiện thư mục đề bài: de_bai_clean (mới) hoặc de_bai (cũ)
    if (raw / "de_bai_clean").exists():
        de_bai_dir = raw / "de_bai_clean"
    elif (raw / "de_bai").exists():
        de_bai_dir = raw / "de_bai"
    else:
        de_bai_dir = raw

    # 3. Phát hiện thư mục đáp án: dap_an_loi_giai_clean (mới) hoặc dap_an_loi_giai (cũ)
    if (raw / "dap_an_loi_giai_clean").exists():
        dap_an_dir = raw / "dap_an_loi_giai_clean"
    elif (raw / "dap_an_loi_giai").exists():
        dap_an_dir = raw / "dap_an_loi_giai"
    else:
        dap_an_dir = raw

    return raw, de_bai_dir, dap_an_dir
