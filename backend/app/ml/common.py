import torch
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

def get_torch_device() -> torch.device:
    """Returns CUDA device if GPU available, otherwise CPU."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")

class SuspiciousRegion(BaseModel):
    id: str
    label: str
    finding: str
    severity: str  # 'low' | 'medium' | 'high'
    xPercent: float
    yPercent: float
    widthPercent: float
    heightPercent: float

class SuspiciousTimestamp(BaseModel):
    timestamp_seconds: float
    frame_number: Optional[int] = None
    score: float
    anomaly_type: str
    severity: str  # 'low' | 'medium' | 'high'

class FlaggedPassage(BaseModel):
    text: str
    reason: str
    score: float
    start_char: Optional[int] = None
    end_char: Optional[int] = None

class StandardizedAnalysisResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    job_id: str
    media_type: str  # 'image' | 'video' | 'audio' | 'text' | 'document' | 'url'
    assessment: str  # 'likely_manipulated' | 'no_strong_indicators_detected' | 'inconclusive'
    assessment_label: str
    model_name: str
    model_version: str
    suspicion_score: float = Field(..., ge=0.0, le=100.0)
    model_confidence: float = Field(..., ge=0.0, le=100.0)
    key_findings: List[str] = []
    evidence_summary: str
    suspicious_regions: List[SuspiciousRegion] = []
    suspicious_timestamps: List[SuspiciousTimestamp] = []
    flagged_passages: List[FlaggedPassage] = []
    file_hash: str
    file_size_bytes: int
    original_filename: str
    mime_type: Optional[str] = None
    technical_metadata: Dict[str, Any] = {}
    processing_duration_ms: int
    limitations: List[str] = []
    interpretation_note: str

def calibrate_assessment(
    raw_suspicion: float,
    confidence_factor: float = 85.0,
    threshold_low: float = 35.0,
    threshold_high: float = 65.0
) -> tuple[str, str, float, float]:
    """
    Neyman-Pearson calibrated decision rule.
    Separates suspicion score from model confidence.
    Never declares 0% or 100% absolute certainty.
    """
    calibrated_suspicion = max(5.0, min(95.0, round(raw_suspicion, 1)))
    calibrated_confidence = max(50.0, min(98.0, round(confidence_factor, 1)))

    if calibrated_suspicion < threshold_low:
        assessment = "no_strong_indicators_detected"
        label = "No Strong Indicators Detected (Likely Authentic)"
    elif calibrated_suspicion <= threshold_high:
        assessment = "inconclusive"
        label = "Inconclusive (Ambiguous Signals)"
    else:
        assessment = "likely_manipulated"
        label = "Likely AI-Generated or Manipulated"

    return assessment, label, calibrated_suspicion, calibrated_confidence
