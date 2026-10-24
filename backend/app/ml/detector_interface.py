from abc import ABC, abstractmethod
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.db.models import PerDetectorScores, VideoFrameAnalysis

class ForensicAnalysisResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    verdict: str  # 'likely_authentic' | 'inconclusive' | 'likely_ai_generated'
    calibrated_confidence: float
    confidence_interval_low: float
    confidence_interval_high: float
    per_detector_scores: PerDetectorScores
    timeline_scores: List[VideoFrameAnalysis] = []
    heatmap_bytes: Optional[bytes] = None
    model_name: str
    model_version: str
    known_error_rate_fpr: float
    known_error_rate_fnr: float
    notes: str

class BaseForensicDetector(ABC):
    @abstractmethod
    async def analyze_image(self, data: bytes, filename: str) -> ForensicAnalysisResult:
        """Analyze still image for generative AI artifacts."""
        pass

    @abstractmethod
    async def analyze_video(self, data: bytes, filename: str) -> ForensicAnalysisResult:
        """Analyze video container, audio track, and keyframes."""
        pass

    @abstractmethod
    async def analyze_text(self, text: str) -> ForensicAnalysisResult:
        """Analyze textual statements for synthetic LLM markers."""
        pass
