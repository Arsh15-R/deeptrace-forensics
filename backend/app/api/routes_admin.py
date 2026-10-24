import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.utils.auth import require_admin, CurrentUser
from app.db.database import (
    list_users,
    get_user_by_id,
    update_user_role,
    update_user_status,
    touch_user_activity,
    delete_user,
    save_audit_log
)
from app.db.models import (
    AdminUserListItem,
    UserRoleUpdateRequest,
    UserStatusUpdateRequest,
    AuditLogRecord
)

router = APIRouter(prefix="/admin", tags=["Administration & Access Control"])

def _parse_iso(timestamp_str: str) -> datetime:
    """Parses ISO timestamp string to UTC datetime object."""
    try:
        clean_str = timestamp_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.min.replace(tzinfo=timezone.utc)

@router.get("/users", response_model=List[AdminUserListItem])
async def get_all_users(admin: CurrentUser = Depends(require_admin)):
    """
    Returns all registered users with their roles and online/offline status.
    Online status is reliably determined if active within the last 5 minutes (300 seconds);
    otherwise is_online is False and last_active_at timestamp is used.
    """
    users = list_users()
    now_utc = datetime.now(timezone.utc)
    items: List[AdminUserListItem] = []

    for u in users:
        last_dt = _parse_iso(u.last_active_at)
        delta_seconds = (now_utc - last_dt).total_seconds()
        # Reliable threshold: active within 300 seconds (5 minutes)
        is_online = (delta_seconds >= 0 and delta_seconds <= 300)

        items.append(
            AdminUserListItem(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                badge_number=u.badge_number,
                department=u.department,
                role=u.role,
                is_active=u.is_active,
                avatar_url=u.avatar_url,
                provider=u.provider,
                last_active_at=u.last_active_at,
                is_online=is_online,
                created_at=u.created_at,
                updated_at=u.updated_at
            )
        )

    return items

@router.post("/users/{user_id}/role", response_model=AdminUserListItem)
async def change_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    request: Request,
    admin: CurrentUser = Depends(require_admin)
):
    """
    Promote users up to Officer or demote to Viewer.
    STRICT POLICY: Promotion to Admin or higher is prohibited and rejected on the server.
    """
    target_role = payload.role.strip().lower()

    if target_role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promotion to Admin is strictly prohibited via the panel."
        )

    if target_role not in ["officer", "viewer"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified. Only 'officer' and 'viewer' are permitted."
        )

    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    if target_user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot modify their own role."
        )

    if target_user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot alter roles of existing administrators."
        )

    action_type = "USER_ROLE_PROMOTED" if target_role == "officer" else "USER_ROLE_DEMOTED"
    updated = update_user_role(user_id, target_role)

    # Record compliance audit log
    save_audit_log(
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id=None,
            case_number=None,
            user_id=admin.id,
            user_email=admin.email,
            user_role="admin",
            action=action_type,
            ip_address=request.client.host if request.client else "127.0.0.1",
            user_agent=request.headers.get("user-agent", "DeepTrace-Admin"),
            details={
                "target_user_id": target_user.id,
                "target_user_email": target_user.email,
                "previous_role": target_user.role,
                "new_role": target_role,
            },
            created_at=datetime.utcnow().isoformat() + "Z"
        )
    )

    last_dt = _parse_iso(updated.last_active_at)
    is_online = ((datetime.now(timezone.utc) - last_dt).total_seconds() <= 300)

    return AdminUserListItem(
        id=updated.id,
        email=updated.email,
        full_name=updated.full_name,
        badge_number=updated.badge_number,
        department=updated.department,
        role=updated.role,
        is_active=updated.is_active,
        avatar_url=updated.avatar_url,
        provider=updated.provider,
        last_active_at=updated.last_active_at,
        is_online=is_online,
        created_at=updated.created_at,
        updated_at=updated.updated_at
    )

@router.post("/users/{user_id}/status", response_model=AdminUserListItem)
async def change_user_status(
    user_id: str,
    payload: UserStatusUpdateRequest,
    request: Request,
    admin: CurrentUser = Depends(require_admin)
):
    """
    Deactivate or reactivate an account.
    Deactivated users are immediately barred from executing examinations or logging in.
    """
    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    if target_user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate themselves."
        )

    if target_user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate an administrator."
        )

    action_type = "USER_REACTIVATED" if payload.is_active else "USER_DEACTIVATED"
    updated = update_user_status(user_id, payload.is_active)

    save_audit_log(
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id=None,
            case_number=None,
            user_id=admin.id,
            user_email=admin.email,
            user_role="admin",
            action=action_type,
            ip_address=request.client.host if request.client else "127.0.0.1",
            user_agent=request.headers.get("user-agent", "DeepTrace-Admin"),
            details={
                "target_user_id": target_user.id,
                "target_user_email": target_user.email,
                "new_active_status": payload.is_active,
            },
            created_at=datetime.utcnow().isoformat() + "Z"
        )
    )

    last_dt = _parse_iso(updated.last_active_at)
    is_online = ((datetime.now(timezone.utc) - last_dt).total_seconds() <= 300)

    return AdminUserListItem(
        id=updated.id,
        email=updated.email,
        full_name=updated.full_name,
        badge_number=updated.badge_number,
        department=updated.department,
        role=updated.role,
        is_active=updated.is_active,
        avatar_url=updated.avatar_url,
        provider=updated.provider,
        last_active_at=updated.last_active_at,
        is_online=is_online,
        created_at=updated.created_at,
        updated_at=updated.updated_at
    )

@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def remove_user(
    user_id: str,
    request: Request,
    admin: CurrentUser = Depends(require_admin)
):
    """
    Permanently delete a user account from the system.
    STRICT SERVER-SIDE ENFORCEMENT:
    - Protect signed-in admin: Administrators cannot delete their own account.
    - Protect all admin accounts: Any account with role 'admin' cannot be deleted.
    - Records an immutable forensic audit log of the deletion.
    """
    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    if target_user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete their own account."
        )

    if target_user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Protected administrator accounts cannot be deleted."
        )

    success = delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user account."
        )

    client_ip = request.client.host if request.client else "127.0.0.1"
    save_audit_log(
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id=None,
            case_number=None,
            user_id=admin.id,
            user_email=admin.email,
            user_role="admin",
            action="USER_DELETED",
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent", "DeepTrace-Admin"),
            details={
                "deleted_user_id": target_user.id,
                "deleted_user_email": target_user.email,
                "deleted_user_name": target_user.full_name,
                "deleted_user_role": target_user.role,
            },
            created_at=datetime.utcnow().isoformat() + "Z"
        )
    )

    return {
        "status": "success",
        "message": f"User {target_user.full_name} ({target_user.email}) permanently deleted.",
        "deleted_id": user_id
    }
