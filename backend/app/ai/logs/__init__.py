import logging
import os
import sys

def setup_logging(log_level: str | None = None) -> None:
    """Set up standardized logging for AI Engine."""
    level_str = log_level or os.getenv("LOG_LEVEL", "DEBUG").upper()
    level = getattr(logging, level_str, logging.DEBUG)

    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Avoid duplicate handlers if setup_logging is called multiple times
    if not root_logger.handlers:
        root_logger.addHandler(handler)
    else:
        root_logger.handlers = [handler]

def get_logger(name: str) -> logging.Logger:
    """Retrieve logger instance with the given name."""
    return logging.getLogger(name)
