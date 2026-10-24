import asyncio
import os
from app.tasks.celery_app import celery_app
from app.ml.mock_detector import forensic_detector
from app.db.database import get_case, save_case, save_audit_log
from app.db.models import AuditLogRecord
import uuid
from datetime import datetime, timezone

@celery_app.task(bind=True, name="process_video_analysis_job")
def process_video_analysis_job(self, case_id: str, video_path: str, officer_id: str):
    """
    Celery background worker task for frame-by-frame forensic video inspection.
    """
    case = get_case(case_id)
    if not case:
        return {"status": "error", "message": f"Case {case_id} not found"}

    if not os.path.exists(video_path):
        return {"status": "error", "message": f"Evidence file {video_path} missing"}

    with open(video_path, "rb") as f:
        data = f.read()

    # Run the detector analysis
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(forensic_detector.analyze_video(data, case.file_name or "video.mp4"))

    # Update case with finished scores
    case.verdict = result.verdict
    case.calibrated_confidence = result.calibrated_confidence
    case.confidence_interval_low = result.confidence_interval_low
    case.confidence_interval_high = result.confidence_interval_high
    case.per_detector_scores = result.per_detector_scores
    case.timeline_scores = result.timeline_scores
    case.updated_at = datetime.now(timezone.utc).isoformat()
    save_case(case)

    # Log audit event
    save_audit_log(AuditLogRecord(
        id=str(uuid.uuid4()),
        case_id=case.id,
        case_number=case.case_number,
        user_id=officer_id,
        user_email="system.celery@police.dept.gov",
        user_role="officer",
        action="ANALYSIS_INITIATED",
        ip_address="127.0.0.1",
        user_agent="Celery-Worker-Daemon",
        details={"status": "completed", "timeline_frames": len(result.timeline_scores)},
        created_at=datetime.now(timezone.utc).isoformat()
    ))

    return {
        "status": "success",
        "case_id": case.id,
        "verdict": case.verdict,
        "calibrated_confidence": case.calibrated_confidence
    }
