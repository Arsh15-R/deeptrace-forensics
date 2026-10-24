from fastapi import APIRouter, Depends, Query, Request
from typing import Optional, List
import uuid
from datetime import datetime, timezone
from app.db.database import list_audit_logs, save_audit_log
from app.db.models import AuditLogRecord
from app.utils.auth import get_current_user, require_admin, CurrentUser

router = APIRouter(prefix="/audit", tags=["Compliance & Audit Logs"])

@router.get("/logs", response_model=List[AuditLogRecord])
async def get_audit_trail(
    limit: int = Query(100, ge=1, le=1000),
    action: Optional[str] = Query(None),
    admin: CurrentUser = Depends(require_admin)
):
    """
    Retrieve immutable audit logs. Restricted strictly to administrative supervisors.
    """
    return list_audit_logs(limit=limit, action=action)

@router.post("/log")
async def log_client_activity(
    action: str,
    case_id: Optional[str] = None,
    details: Optional[dict] = None,
    request: Request = None,
    user: CurrentUser = Depends(get_current_user)
):
    """
    Record client-side user operations (e.g. search, filter, view case).
    """
    client_ip = request.client.host if request and request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Client") if request else "Client"

    entry = AuditLogRecord(
        id=str(uuid.uuid4()),
        case_id=case_id,
        user_id=user.id,
        user_email=user.email,
        user_role=user.role,
        action=action,
        ip_address=client_ip,
        user_agent=user_agent,
        details=details or {},
        created_at=datetime.now(timezone.utc).isoformat()
    )
    return save_audit_log(entry)
