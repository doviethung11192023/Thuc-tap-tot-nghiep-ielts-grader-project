"""Cấu hình logging một chỗ cho API và worker ARQ.

Vì sao cần: nếu không cấu hình, logger.info của code ứng dụng bị bỏ (mức mặc định của root là WARNING),
nên thông điệp tiến trình chấm bài và cron sẽ biến mất. Cả `uvicorn app.main:app` lẫn
`arq app.worker.tasks.WorkerSettings` đều import module của app, nên gọi configure_logging() ở đầu hai nơi
đó là đủ. Gọi nhiều lần vẫn an toàn (không nhân đôi handler).
"""
import logging
import sys

LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"

_configured = False


def configure_logging(level: int = logging.INFO) -> None:
    """Gắn handler stdout (UTF-8, vì thông điệp có tiếng Việt và biểu tượng) cho root logger ở mức INFO."""
    global _configured
    if _configured:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    root = logging.getLogger()
    root.addHandler(handler)
    root.setLevel(level)
    # httpx/httpcore ghi INFO cho từng request tới Supabase/engine, làm ngập log
    for noisy in ("httpx", "httpcore", "hpack"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    _configured = True
