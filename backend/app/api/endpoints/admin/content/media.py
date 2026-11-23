from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from typing import Optional
import uuid
import os
from app.core.security import require_admin, User
from app.services.r2_storage import r2_storage

router = APIRouter()

ALLOWED_MIME_TYPES = {
    # Audio
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm",
    # Images
    "image/jpeg", "image/png", "image/webp", "image/svg+xml"
}

MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024  # 30MB

@router.post("/media/upload", status_code=status.HTTP_201_CREATED)
async def upload_media_file(
    file: UploadFile = File(...),
    folder: str = Form("general"),
    current_user: User = Depends(require_admin)
):
    """
    Tải file Audio hoặc Hình ảnh lên Cloudflare R2 Storage (S3-compatible).
    Trả về object key và URL CDN công khai.
    """
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng tệp không được hỗ trợ: {file.content_type}. Chỉ chấp nhận mp3, wav, ogg, jpg, png, webp, svg."
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Dung lượng tệp vượt quá giới hạn cho phép (tối đa 30MB)."
        )

    ext = os.path.splitext(file.filename or "")[1].lower()
    unique_filename = f"{uuid.uuid4().hex[:12]}{ext}"
    clean_folder = folder.strip("/").replace("..", "")
    key = f"{clean_folder}/{unique_filename}"

    public_url = r2_storage.upload_file(
        file_bytes=file_bytes,
        key=key,
        content_type=file.content_type
    )

    return {
        "meta": {"code": 201, "message": "Tải tệp lên Cloudflare R2 thành công"},
        "data": {
            "key": key,
            "url": public_url,
            "filename": file.filename,
            "size_bytes": len(file_bytes),
            "content_type": file.content_type
        }
    }
