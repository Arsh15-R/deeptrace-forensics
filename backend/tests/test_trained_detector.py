import os
import io
import pytest
from PIL import Image
from app.ml.trained_detector import TrainedForensicDetector
from app.ml.detector_interface import ForensicAnalysisResult
from app.ml.common import StandardizedAnalysisResult


def create_test_image(color=(128, 128, 128), size=(224, 224)):
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def test_detector_initialization():
    detector = TrainedForensicDetector()
    assert detector is not None
    assert detector.config is not None
    assert "model_name" in detector.config
    assert "temperature" in detector.config


def test_detector_output_schema():
    detector = TrainedForensicDetector()
    img_bytes = create_test_image((100, 150, 200))
    result, heatmap = detector.analyze(img_bytes, "test.jpg", "test-case-001")

    assert isinstance(result, StandardizedAnalysisResult)
    assert 0.0 <= result.suspicion_score <= 100.0
    assert 0.0 <= result.model_confidence <= 100.0
    assert result.assessment in ("likely_manipulated", "no_strong_indicators_detected", "inconclusive")
    assert isinstance(result.key_findings, list)
    assert len(result.key_findings) > 0
    assert heatmap is None or isinstance(heatmap, bytes)


@pytest.mark.asyncio
async def test_detector_async_interface():
    detector = TrainedForensicDetector()
    img_bytes = create_test_image((120, 140, 160))
    async_res = await detector.analyze_image(img_bytes, "test_async.jpg")

    assert isinstance(async_res, ForensicAnalysisResult)
    assert 0.0 <= async_res.calibrated_confidence <= 100.0
    assert 0.0 <= async_res.confidence_interval_low <= 100.0
    assert 0.0 <= async_res.confidence_interval_high <= 100.0
    assert async_res.confidence_interval_low <= async_res.confidence_interval_high
    assert async_res.verdict in ("likely_authentic", "inconclusive", "likely_ai_generated")
    assert async_res.per_detector_scores is not None


def test_detector_idempotency():
    detector = TrainedForensicDetector()
    img_bytes = create_test_image((70, 80, 90))

    res1, _ = detector.analyze(img_bytes, "test_idem.jpg", "test-case-002")
    res2, _ = detector.analyze(img_bytes, "test_idem.jpg", "test-case-003")

    # The suspicion score for the exact same input should be identical
    assert abs(res1.suspicion_score - res2.suspicion_score) < 0.001


def test_recompression_stability():
    detector = TrainedForensicDetector()
    original_img = Image.new("RGB", (256, 256), color=(140, 120, 100))
    buf1 = io.BytesIO()
    original_img.save(buf1, format="JPEG", quality=90)
    bytes1 = buf1.getvalue()

    # Re-compress at quality 60
    buf2 = io.BytesIO()
    original_img.save(buf2, format="JPEG", quality=60)
    bytes2 = buf2.getvalue()

    res1, _ = detector.analyze(bytes1, "orig.jpg", "case-rec-1")
    res2, _ = detector.analyze(bytes2, "recomp.jpg", "case-rec-2")

    # Score should remain within +/- 15% under moderate JPEG re-compression
    diff = abs(res1.suspicion_score - res2.suspicion_score)
    assert diff <= 15.0, f"Score diverged by {diff} under re-compression (res1={res1.suspicion_score}, res2={res2.suspicion_score})"


def test_mock_fallback_when_checkpoint_absent():
    fallback_detector = TrainedForensicDetector(checkpoint_path="non_existent_weights.pt")
    assert fallback_detector.model is None
    assert fallback_detector.is_fallback is True

    img_bytes = create_test_image((120, 130, 140))
    res, _ = fallback_detector.analyze(img_bytes, "fallback.jpg", "case-fallback")
    assert isinstance(res, StandardizedAnalysisResult)
    note = (res.interpretation_note or "") + " ".join(res.limitations)
    assert "PROTOTYPE WARNING" in note or "mock" in note.lower() or "checkpoint" in note.lower()
