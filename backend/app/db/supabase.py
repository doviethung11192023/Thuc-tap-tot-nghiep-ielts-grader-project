import os
import time
import jwt
from supabase import create_client, Client
from app.core.config import settings

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
            print(f"[Supabase] Warning configuring service_role JWT: {e}")
            
    return client

supabase: Client = get_supabase_client()
