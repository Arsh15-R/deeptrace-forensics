from fastapi import APIRouter, Depends, HTTPException, status
from app.utils.auth import get_current_user, CurrentUser

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])

@router.get("/me", response_model=CurrentUser)
async def get_authenticated_user_profile(user: CurrentUser = Depends(get_current_user)):
    """
    Returns the server-side profile and authoritative role for the currently authenticated Google user.
    Role is strictly retrieved from the persistent SQLite database record, never client-controlled claims.
    """
    return user
