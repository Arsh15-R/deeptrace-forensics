from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List

class DetectorBreakdown(BaseModel):
    name: str
    category: str
    score: float = Field(..., ge=0.0, le=100.0, description="Synthetic likelihood score from 0% to 100%")
    weight: float = Field(..., ge=0.0, le=1.0)
    flagged: bool
    status: str
    detail: str

class PerDetectorScores(BaseModel):
    pixel_patterns: float = Field(..., ge=0.0, le=100.0, description="High-frequency spectral noise residuals and GAN checkerboard artifacts")
    face_lighting: float = Field(..., ge=0.0, le=100.0, description="Corneal reflection symmetry, light vector angles, gaze alignment")
    metadata_exif: float = Field(..., ge=0.0, le=100.0, description="C2PA content credentials, quantization tables, camera sensor signature")
    motion_temporal: Optional[float] = Field(None, ge=0.0, le=100.0, description="Temporal frame-to-frame warping, blinking cadence, optical flow")
    audio_spectral: Optional[float] = Field(None, ge=0.0, le=100.0, description="Voice cloning vocoder anomalies, spectral cutoff, phase coherence")
    breakdown: List[DetectorBreakdown] = []
    in_text_metadata: Optional[Dict[str, Any]] = None
    inTextMetadata: Optional[Dict[str, Any]] = None

class VideoFrameAnalysis(BaseModel):
    frame_number: int
    timestamp_seconds: float
    score: float
    flagged: bool
    anomaly_type: Optional[str] = None

class CaseRecord(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    id: str
    case_number: str
    officer_id: str
    officer_name: str
    officer_badge: str
    department: str
    media_type: str  # 'image' | 'video' | 'link' | 'text'
    file_name: Optional[str] = None
    source_url: Optional[str] = None
    storage_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    sha256_hash: str
    mime_type: Optional[str] = None
    
    # Forensic Evaluation
    verdict: str  # 'likely_authentic' | 'inconclusive' | 'likely_ai_generated'
    calibrated_confidence: float
    confidence_interval_low: float
    confidence_interval_high: float
    per_detector_scores: PerDetectorScores
    
    # Evidence Visuals & Timeline
    heatmap_url: Optional[str] = None
    heatmap_path: Optional[str] = None
    media_url: Optional[str] = None
    timeline_scores: List[VideoFrameAnalysis] = []
    text_snippet: Optional[str] = None
    
    # Model Metadata & Error Calibration
    model_name: str = "DeepTrace-Ensemble-Core"
    model_version: str = "v2.4-hybrid"
    known_error_rate_fpr: float = 4.20
    known_error_rate_fnr: float = 6.80
    limitations_notes: str = (
        "Automated forensic triage output. Calibrated using Neyman-Pearson decision boundaries. "
        "Adversarial perturbation, multiple heavy re-encodings, or low-resolution crops may widen uncertainty bounds. "
        "This record constitutes an investigative lead, not admissible self-authenticating expert testimony."
    )
    
    created_at: str
    updated_at: str

class AuditLogRecord(BaseModel):
    id: str
    case_id: Optional[str] = None
    case_number: Optional[str] = None
    user_id: str
    user_email: str
    user_role: str
    action: str  # e.g. 'USER_SIGN_IN' | 'USER_SIGN_OUT' | 'EVIDENCE_UPLOADED' | 'EVIDENCE_VIEWED' | 'EVIDENCE_DOWNLOADED' | 'EVIDENCE_DELETED' | 'CASE_CREATED' | 'CASE_VIEWED' | 'CASE_UPDATED' | 'CASE_DELETED' | 'ANALYSIS_STARTED' | 'ANALYSIS_COMPLETED' | 'REPORT_GENERATED' | 'REPORT_DOWNLOADED' | 'USER_ROLE_PROMOTED' | 'USER_ROLE_DEMOTED' | 'USER_DEACTIVATED' | 'USER_REACTIVATED' | 'USER_DELETED'
    ip_address: Optional[str] = "127.0.0.1"
    user_agent: Optional[str] = "DeepTrace-Client"
    details: Dict[str, Any] = {}
    created_at: str

class ClientAuditLogRequest(BaseModel):
    action: str
    case_id: Optional[str] = None
    case_number: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)

class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=20, max_length=50000, description="The textual statement or transcript to analyze")
    case_reference: Optional[str] = None

class LinkAnalysisRequest(BaseModel):
    url: str = Field(..., description="Public media URL to securely ingest")
    case_reference: Optional[str] = None

class UserRecord(BaseModel):
    id: str
    email: str
    full_name: str
    badge_number: Optional[str] = None
    department: Optional[str] = None
    role: str = "viewer"  # 'viewer' | 'officer' | 'admin'
    is_active: bool = True
    avatar_url: Optional[str] = None
    provider: str = "google"
    last_active_at: str
    created_at: str
    updated_at: str

class AdminUserListItem(BaseModel):
    id: str
    email: str
    full_name: str
    badge_number: Optional[str] = None
    department: Optional[str] = None
    role: str
    is_active: bool
    avatar_url: Optional[str] = None
    provider: str
    last_active_at: str
    is_online: bool
    created_at: str
    updated_at: str

class UserRoleUpdateRequest(BaseModel):
    role: str  # strictly 'officer' or 'viewer'

class UserStatusUpdateRequest(BaseModel):
    is_active: bool
