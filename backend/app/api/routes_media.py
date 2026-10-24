import os
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from fastapi.responses import FileResponse
from typing import Optional
from app.config import settings
from app.db.database import get_case
from app.utils.auth import get_current_user, CurrentUser
from app.utils.security import verify_signed_evidence_token

router = APIRouter(prefix="/media", tags=["Media Vault"])

@router.get("/evidence/{case_id}")
async def get_evidence_file(
    case_id: str,
    token: Optional[str] = Query(None),
    user: Optional[CurrentUser] = Depends(get_current_user)
):
    """
    Secure retrieval of original evidence media.
    Requires either a valid signed temporary token or an authenticated officer session.
    """
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case record not found.")

    if not case.storage_path:
        raise HTTPException(status_code=404, detail="No stored media file associated with this case.")

    # Authorization verification
    authorized = False
    if token and verify_signed_evidence_token(case_id, case.storage_path, token):
        authorized = True
    elif user:
        if user.role == "admin" or user.id == case.officer_id:
            authorized = True

    if not authorized:
        raise HTTPException(status_code=403, detail="Unauthorized access to restricted police evidence vault.")

    full_path = os.path.abspath(os.path.join(settings.LOCAL_STORAGE_DIR, case.storage_path))
    if not full_path.startswith(settings.LOCAL_STORAGE_DIR):
        raise HTTPException(status_code=403, detail="Illegal evidence path reference.")

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Evidence binary file not found on storage disk.")

    media_type = case.mime_type or "application/octet-stream"
    return FileResponse(
        path=full_path,
        media_type=media_type,
        filename=case.file_name or f"evidence_{case.case_number}"
    )

@router.get("/heatmap/{case_id}")
async def get_heatmap_overlay(case_id: str):
    """
    Retrieves the generated thermal anomaly heatmap PNG for image cases.
    """
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case record not found.")

    heatmap_path = case.heatmap_path or f"heatmaps/{case.id}.png"
    full_path = os.path.join(settings.LOCAL_STORAGE_DIR, heatmap_path)

    if not os.path.exists(full_path):
        # Generate on demand if file was purged
        if case.storage_path:
            orig_path = os.path.join(settings.LOCAL_STORAGE_DIR, case.storage_path)
            if os.path.exists(orig_path):
                from app.ml.heatmap_gen import generate_forensic_heatmap
                with open(orig_path, "rb") as f:
                    hm_bytes = generate_forensic_heatmap(f.read())
                with open(full_path, "wb") as f:
                    f.write(hm_bytes)
                return Response(content=hm_bytes, media_type="image/png")
        raise HTTPException(status_code=404, detail="Heatmap not available for this case type.")

    return FileResponse(path=full_path, media_type="image/png")
