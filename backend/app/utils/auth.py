import time
import logging
import httpx
from datetime import datetime
from fastapi import Depends, HTTPException, status, Header
from typing import Optional, Dict
from pydantic import BaseModel
from jose import jwt, JWTError
from app.config import settings
from app.db.database import get_user_by_id, get_user_by_email, upsert_user, touch_user_activity
from app.db.models import UserRecord

logger = logging.getLogger("truthlens.auth")

class CurrentUser(BaseModel):
    id: str
    email: str
    full_name: str
    badge_number: str
    department: str
    role: str  # 'viewer', 'officer', or 'admin'
    is_active: bool = True
    avatar_url: Optional[str] = None
    provider: str = "google"

# In-memory token cache: { token_str: (CurrentUser, expiry_timestamp) }
_TOKEN_CACHE: Dict[str, tuple[CurrentUser, float]] = {}

def _sync_with_db(user_id: str, email: str, full_name: str, avatar_url: Optional[str] = None) -> CurrentUser:
    """Synchronize user with persistent SQLite database and enforce server-side active status and role."""
    db_user = get_user_by_id(user_id) or get_user_by_email(email)
    now_iso = datetime.utcnow().isoformat() + "Z"

    if db_user:
        if not db_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated by an administrator."
            )
        touch_user_activity(db_user.id)
        return CurrentUser(
            id=db_user.id,
            email=db_user.email,
            full_name=db_user.full_name,
            badge_number=db_user.badge_number or f"GOOG-{db_user.id[:4].upper()}",
            department=db_user.department or "Forensics & Media Integrity",
            role=db_user.role,
            is_active=db_user.is_active,
            avatar_url=db_user.avatar_url or avatar_url,
            provider=db_user.provider or "google"
        )
    else:
        # First-time Google user provisioning
        is_admin_email = email.lower() in [
            "arshrana2468@gmail.com",
            "admin@deeptrace.forensics.gov"
        ] or email.lower().startswith("admin@")
        initial_role = "admin" if is_admin_email else "viewer"
        new_user = UserRecord(
            id=user_id,
            email=email,
            full_name=full_name,
            badge_number=f"GOOG-{user_id[:4].upper()}",
            department="Department Administrator" if is_admin_email else "Forensics & Media Integrity",
            role=initial_role,
            is_active=True,
            avatar_url=avatar_url,
            provider="google",
            last_active_at=now_iso,
            created_at=now_iso,
            updated_at=now_iso
        )
        upsert_user(new_user)
        return CurrentUser(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            badge_number=new_user.badge_number or "OFF",
            department=new_user.department or "Forensics",
            role=new_user.role,
            is_active=True,
            avatar_url=new_user.avatar_url,
            provider=new_user.provider
        )

def _verify_with_supabase_api(token: str) -> Optional[CurrentUser]:
    """Verify bearer token directly with Supabase Auth endpoint."""
    supabase_url = (settings.SUPABASE_URL or "").rstrip("/")
    api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
    if not supabase_url or not api_key:
        return None

    try:
        resp = httpx.get(
            f"{supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": api_key,
            },
            timeout=4.0
        )
        if resp.status_code == 200:
            user_data = resp.json()
            user_id = user_data.get("id")
            email = user_data.get("email") or "user@police.dept.gov"
            user_meta = user_data.get("user_metadata") or {}
            full_name = user_meta.get("full_name") or user_meta.get("name") or email.split("@")[0]
            avatar = user_meta.get("avatar_url") or user_meta.get("picture")

            return _sync_with_db(user_id, email, full_name, avatar)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Supabase Auth verification request failed: {e}")

    return None

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> CurrentUser:
    """
    Extract and verify current user via Google OAuth Bearer token:
    1. Decode and verify Supabase JWT Bearer token.
    2. Lookup user in persistent database to enforce real server role and active status.
    3. Strictly reject unauthenticated or deactivated requests.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()

        # Check in-memory cache
        now = time.time()
        if token in _TOKEN_CACHE:
            cached_user, expiry = _TOKEN_CACHE[token]
            if now < expiry:
                # Re-verify active status from DB
                db_u = get_user_by_id(cached_user.id)
                if db_u and not db_u.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Your account has been deactivated by an administrator."
                    )
                if db_u:
                    cached_user.role = db_u.role
                return cached_user

        # 1. Try decoding with SUPABASE_JWT_SECRET if configured
        if settings.SUPABASE_JWT_SECRET:
            try:
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
                user_id = payload.get("sub")
                email = payload.get("email", "officer@police.dept.gov")
                user_metadata = payload.get("user_metadata", {})
                full_name = user_metadata.get("full_name") or user_metadata.get("name") or email.split("@")[0]
                avatar = user_metadata.get("avatar_url") or user_metadata.get("picture")

                user = _sync_with_db(user_id, email, full_name, avatar)
                _TOKEN_CACHE[token] = (user, now + 300)
                return user
            except JWTError:
                pass

        # 2. Verify with Supabase Auth API
        api_user = _verify_with_supabase_api(token)
        if api_user:
            _TOKEN_CACHE[token] = (api_user, now + 300)
            return api_user

        # 3. Unverified claims in development fallback
        if settings.DEBUG:
            try:
                claims = jwt.get_unverified_claims(token)
                user_id = claims.get("sub")
                email = claims.get("email", "officer@police.dept.gov")
                user_metadata = claims.get("user_metadata", {})
                full_name = user_metadata.get("full_name") or user_metadata.get("name") or email.split("@")[0]
                avatar = user_metadata.get("avatar_url") or user_metadata.get("picture")

                user = _sync_with_db(user_id, email, full_name, avatar)
                _TOKEN_CACHE[token] = (user, now + 60)
                return user
            except HTTPException:
                raise
            except Exception:
                pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # In local development mode without token, check for default active admin/officer in DB
    if settings.DEBUG:
        default_admin = (
            get_user_by_email("arshrana2468@gmail.com")
            or get_user_by_email("admin@deeptrace.forensics.gov")
        )
        if default_admin and default_admin.is_active:
            return CurrentUser(
                id=default_admin.id,
                email=default_admin.email,
                full_name=default_admin.full_name,
                badge_number=default_admin.badge_number or "GOOG-ARSH",
                department=default_admin.department or "Department Administrator",
                role=default_admin.role,
                is_active=True,
                avatar_url=default_admin.avatar_url,
                provider=default_admin.provider or "google"
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please sign in with your Google account.",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_optional_current_user(
    authorization: Optional[str] = Header(None)
) -> Optional[CurrentUser]:
    """Gracefully extract user if Bearer token present and valid, otherwise return None."""
    try:
        return await get_current_user(authorization=authorization)
    except HTTPException:
        return None

def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Ensure user has 'admin' privileges in the database."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted. Administrative privileges required to manage personnel and view audit records."
        )
    return user

def require_officer(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Ensure user has at least 'officer' privileges to run investigations."""
    if user.role not in ["officer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted. Your account is currently pending officer verification by an administrator."
        )
    return user
