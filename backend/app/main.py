import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import init_db, seed_demo_data_if_empty
from app.api.routes_cases import router as cases_router
from app.api.routes_media import router as media_router
from app.api.routes_report import router as report_router
from app.api.routes_audit import router as audit_router
from app.api.routes_analysis import router as analysis_router
from app.api.routes_admin import router as admin_router
from app.api.routes_auth import router as auth_router
from app.ml.engine import forensic_engine
from app.utils.auth import get_current_user, CurrentUser

logger = logging.getLogger("deeptrace")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure SQLite database tables and demo seed data exist
    init_db()
    seed_demo_data_if_empty()
    logger.info(f"[{settings.APP_NAME}] Backend initialized successfully.")
    logger.info(f"[{settings.APP_NAME}] Local evidence vault: {settings.LOCAL_STORAGE_DIR}")
    yield
    logger.info(f"[{settings.APP_NAME}] Shutting down cleanly.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Law Enforcement Forensic Media Authenticity & Chain-of-Custody Examination Platform",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Modular Routers
app.include_router(auth_router, prefix="/api")
app.include_router(cases_router, prefix="/api")
app.include_router(media_router, prefix="/api")
app.include_router(report_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(analysis_router)

@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
async def health_check():
    """Health & Readiness probe."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "image_model": forensic_engine.image_detector.model_name,
        "video_model": forensic_engine.video_detector.model_name,
        "audio_model": forensic_engine.audio_detector.model_name,
        "text_model": forensic_engine.text_detector.model_name
    }

# Explicit /predict endpoint as mandated by specifications
# Provides a clean, standardized ML inference interface for PyTorch / HuggingFace model swapping
@app.post("/predict", tags=["Model Inference Interface"])
async def predict_synthetic_media(
    file: UploadFile = File(...),
    model_override: str = Form("ensemble_default"),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Standardized inference contract for PyTorch / HuggingFace detector models.
    Swappable interface: returns standardized confidence, uncertainty bounds, and per-detector scores.
    """
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty byte payload submitted for inference.")

    content_type = file.content_type or "image/jpeg"
    filename = file.filename or "input.jpg"
    job_id = f"TL-PRED-{file.filename[:8] if file.filename else 'MEDIA'}"

    if "video" in content_type:
        result = forensic_engine.video_detector.analyze(data, filename, job_id)
    elif "audio" in content_type:
        result = forensic_engine.audio_detector.analyze(data, filename, job_id)
    else:
        result, _ = forensic_engine.image_detector.analyze(data, filename, job_id)

    verdict_map = {
        "likely_manipulated": "likely_ai_generated",
        "no_strong_indicators_detected": "likely_authentic",
        "inconclusive": "inconclusive"
    }

    return {
        "model_name": result.model_name,
        "model_version": result.model_version,
        "verdict": verdict_map.get(result.assessment, "inconclusive"),
        "calibrated_confidence": result.suspicion_score,
        "uncertainty_interval": {
            "lower_bound": max(1.0, result.suspicion_score - 6.5),
            "upper_bound": min(99.0, result.suspicion_score + 6.5),
            "margin": 6.5
        },
        "model_confidence": result.model_confidence,
        "key_findings": result.key_findings,
        "evidentiary_notice": result.evidence_summary
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
