import os
import threading
import time
import httpx
import jwt
from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

_thread_local = threading.local()


def _attach_resilient_transport(http_client: httpx.Client) -> None:
    """Bọc httpx.Client với keep-alive ngắn (15s) và tự reset socket khi Windows/Cloudflare ngắt đột ngột."""

    def _new_transport() -> httpx.HTTPTransport:
        return httpx.HTTPTransport(
            retries=3,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=5, keepalive_expiry=15.0),
        )

    old_transport = getattr(http_client, "_transport", None)
    http_client._transport = _new_transport()
    if old_transport is not None:
        try:
            old_transport.close()
        except Exception:
            pass

    orig_request = http_client.request

    def _request_with_retry(*args, **kwargs):
        last_exc: Exception | None = None
        for attempt in range(3):
            try:
                return orig_request(*args, **kwargs)
            except httpx.TransportError as exc:
                last_exc = exc
                try:
                    http_client._transport.close()
                except Exception:
                    pass
                http_client._transport = _new_transport()
                time.sleep(0.15 * (attempt + 1))
        if last_exc is not None:
            raise last_exc
        return orig_request(*args, **kwargs)

    http_client.request = _request_with_retry


def get_supabase_client() -> Client:
    client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    # If SUPABASE_JWT_SECRET is available, attach service_role authorization to PostgREST
    # so backend API and workers operate with full bypassrls privileges as designed
    if hasattr(settings, "SUPABASE_JWT_SECRET") and settings.SUPABASE_JWT_SECRET:
        try:
            ref = "peozqycguicekozognbb"
            if "//" in settings.SUPABASE_URL:
                parts = settings.SUPABASE_URL.split("//")[1].split(".")
                if parts and parts[0]:
                    ref = parts[0]
            
            payload = {
                "iss": "supabase",
                "ref": ref,
                "role": "service_role",
                "iat": int(time.time()),
                "exp": int(time.time()) + 10 * 365 * 24 * 3600
            }
            service_jwt = jwt.encode(payload, settings.SUPABASE_JWT_SECRET.strip(), algorithm="HS256")
            client.postgrest.headers["authorization"] = f"Bearer {service_jwt}"
            if hasattr(client.postgrest, "session"):
                client.postgrest.session.headers["authorization"] = f"Bearer {service_jwt}"

            # Attach service_role Authorization to GoTrue Admin API
            if hasattr(client, "auth") and hasattr(client.auth, "admin") and hasattr(client.auth.admin, "_headers"):
                client.auth.admin._headers["Authorization"] = f"Bearer {service_jwt}"
        except Exception as e:
            logger.warning(f"[Supabase] Warning configuring service_role JWT: {e}")

    if hasattr(client, "postgrest") and hasattr(client.postgrest, "session") and isinstance(client.postgrest.session, httpx.Client):
        _attach_resilient_transport(client.postgrest.session)
    if hasattr(client, "auth") and hasattr(client.auth, "_http_client") and isinstance(client.auth._http_client, httpx.Client):
        _attach_resilient_transport(client.auth._http_client)

    return client

supabase: Client = get_supabase_client()
_main_thread_id = threading.get_ident()


def db() -> Client:
    """
    Client PostgREST (service_role) thread-safe cho dữ liệu ứng dụng — schema public.
    Mỗi worker thread sở hữu httpx.Client riêng để tránh lỗi HTTP/2 Server disconnected khi chạy song song.
    """
    if threading.get_ident() == _main_thread_id:
        return supabase
    client = getattr(_thread_local, "client", None)
    if client is None:
        client = get_supabase_client()
        _thread_local.client = client
    return client
