from functools import lru_cache
from langfuse import Langfuse
from settings import config

@lru_cache
def get_langfuse_client():
    settings = config.get_settings()
    return Langfuse(
        public_key=settings.langfuse_public_key,
        secret_key=settings.langfuse_secret_key,
        base_url=settings.langfuse_base_url,
    )