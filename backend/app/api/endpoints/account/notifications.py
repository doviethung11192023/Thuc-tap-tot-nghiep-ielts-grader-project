"""Endpoints quản lý thông báo cá nhân (Learner & Expert)."""
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import User, get_current_active_user
from app.services.notifications.notification_service import (
    list_user_notifications,
    mark_all_notifications_read,
    mark_notification_read,
)

router = APIRouter()


@router.get("")
def get_my_notifications(
    limit: int = Query(30, ge=1, le=50),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
):
    return list_user_notifications(current_user.id, limit=limit, unread_only=unread_only)


@router.patch("/{notification_id}/read")
def read_notification(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
):
    updated = mark_notification_read(current_user.id, notification_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return updated


@router.post("/read-all")
def read_all_notifications(current_user: User = Depends(get_current_active_user)):
    updated_count = mark_all_notifications_read(current_user.id)
    return {"updated_count": updated_count}
