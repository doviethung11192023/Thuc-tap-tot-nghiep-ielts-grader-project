"""Gom route Expert (prefix /expert gắn ở api_router): hồ sơ, bài được phân công, phòng chấm."""
from fastapi import APIRouter

from app.api.endpoints.expert import assignments, profile, workspace

router = APIRouter()
router.include_router(profile.router)
router.include_router(assignments.router)
router.include_router(workspace.router)
