import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from app.config import settings
from app.db.database import get_case, save_audit_log
from app.db.models import AuditLogRecord
from app.utils.auth import get_current_user, CurrentUser
from app.reports.pdf_generator import generate_case_pdf

router = APIRouter(prefix="/reports", tags=["Forensic Reports"])

@router.get("/{case_id}/pdf")
async def download_case_report_pdf(
    case_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user)
):
    """
    Generates and returns an evidentiary forensic PDF report.
    Logs every download event to the immutable audit ledger.
    """
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case record not found.")

    # Locate media paths for embedding if available
    orig_path = None
    if case.storage_path:
        full_orig = os.path.join(settings.LOCAL_STORAGE_DIR, case.storage_path)
        if os.path.exists(full_orig) and case.media_type == "image":
            orig_path = full_orig

    hm_path = None
    if case.heatmap_path:
        full_hm = os.path.join(settings.LOCAL_STORAGE_DIR, case.heatmap_path)
        if os.path.exists(full_hm):
            hm_path = full_hm

    # Generate PDF bytes via ReportLab
    try:
        pdf_bytes = generate_case_pdf(case, original_image_path=orig_path, heatmap_image_path=hm_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compile forensic PDF document: {str(e)}")

    # Audit Logging
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown-Browser")

    save_audit_log(AuditLogRecord(
        id=str(uuid.uuid4()),
        case_id=case.id,
        case_number=case.case_number,
        user_id=user.id,
        user_email=user.email,
        user_role=user.role,
        action="REPORT_DOWNLOADED",
        ip_address=client_ip,
        user_agent=user_agent,
        details={
            "format": "PDF",
            "file_size_bytes": len(pdf_bytes),
            "sha256": case.sha256_hash,
            "verdict": case.verdict
        },
        created_at=datetime.now(timezone.utc).isoformat()
    ))

    filename = f"DeepTrace_Forensic_Report_{case.case_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
