import os
import mimetypes
from pathlib import Path
from typing import Optional
import boto3
from botocore.config import Config
from app.core.config import settings

class R2StorageService:
    """Service to interact with Cloudflare R2 (S3-compatible) storage."""

    def __init__(self):
        self.account_id = settings.R2_ACCOUNT_ID
        self.access_key = settings.R2_ACCESS_KEY_ID
        self.secret_key = settings.R2_SECRET_ACCESS_KEY
        self.bucket_name = settings.R2_BUCKET_NAME
        self.public_domain = settings.R2_PUBLIC_DOMAIN
        self.local_fallback_dir = Path("uploads/media")

    @property
    def is_configured(self) -> bool:
        return bool(self.account_id and self.access_key and self.secret_key and self.bucket_name)

    def _get_client(self):
        clean_id = self.account_id.replace("https://", "").replace("http://", "").replace(".r2.cloudflarestorage.com", "").strip("/")
        endpoint_url = f"https://{clean_id}.r2.cloudflarestorage.com"
        return boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version="s3v4"),
            region_name="auto"
        )

    def upload_file(self, file_bytes: bytes, key: str, content_type: Optional[str] = None) -> str:
        """
        Uploads file to Cloudflare R2. Falls back to local storage if credentials are absent.
        Returns the public URL or media key.
        """
        clean_key = key.lstrip("/")
        if not content_type:
            content_type, _ = mimetypes.guess_type(clean_key)
            content_type = content_type or "application/octet-stream"

        if self.is_configured:
            client = self._get_client()
            client.put_object(
                Bucket=self.bucket_name,
                Key=clean_key,
                Body=file_bytes,
                ContentType=content_type
            )
            return self.get_file_url(clean_key)

        # Fallback for local dev/testing
        dest_path = self.local_fallback_dir / clean_key
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(file_bytes)
        return self.get_file_url(clean_key)

    def get_file_url(self, key: str) -> str:
        """Returns public CDN/URL for the given key."""
        clean_key = key.lstrip("/")
        if self.public_domain:
            domain = self.public_domain.rstrip("/")
            if not domain.startswith("http://") and not domain.startswith("https://"):
                domain = f"https://{domain}"
            return f"{domain}/{clean_key}"
        return f"/uploads/media/{clean_key}"

    def delete_file(self, key: str) -> bool:
        """Deletes a file from R2 or local fallback."""
        clean_key = key.lstrip("/")
        if self.is_configured:
            try:
                client = self._get_client()
                client.delete_object(Bucket=self.bucket_name, Key=clean_key)
                return True
            except Exception:
                return False
        local_path = self.local_fallback_dir / clean_key
        if local_path.exists():
            local_path.unlink()
            return True
        return False

r2_storage = R2StorageService()
