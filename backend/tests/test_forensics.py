import pytest
import io
from PIL import Image
from app.utils.security import calculate_sha256, is_ip_blocked, validate_outbound_url, generate_signed_evidence_token, verify_signed_evidence_token
from app.ml.mock_detector import forensic_detector
from app.reports.pdf_generator import generate_case_pdf
from app.db.database import init_db
from app.db.models import CaseRecord, PerDetectorScores
import uuid
from datetime import datetime, timezone

def test_sha256_calculation():
    sample_bytes = b"evidence_payload_test_police_1234"
    h = calculate_sha256(sample_bytes)
    assert len(h) == 64
    assert h == calculate_sha256(sample_bytes)

def test_ssrf_ip_blocking():
    # Loopback
    assert is_ip_blocked("127.0.0.1") is True
    # RFC 1918 Private ranges
    assert is_ip_blocked("10.0.0.1") is True
    assert is_ip_blocked("172.16.0.5") is True
    assert is_ip_blocked("192.168.1.1") is True
    # AWS / GCP metadata
    assert is_ip_blocked("169.254.169.254") is True
    # IPv6 loopback
    assert is_ip_blocked("::1") is True
    # Public IPs should NOT be blocked
    assert is_ip_blocked("8.8.8.8") is False
    assert is_ip_blocked("1.1.1.1") is False

def test_url_ssrf_validator():
    # Internal URLs must be rejected
    is_safe, _, _ = validate_outbound_url("http://127.0.0.1:8080/secret")
    assert is_safe is False

    is_safe, _, _ = validate_outbound_url("http://localhost:3000")
    assert is_safe is False

    is_safe, _, _ = validate_outbound_url("http://169.254.169.254/latest/meta-data")
    assert is_safe is False

    # Disallowed protocols
    is_safe, _, _ = validate_outbound_url("file:///etc/passwd")
    assert is_safe is False

    is_safe, _, _ = validate_outbound_url("gopher://127.0.0.1")
    assert is_safe is False

def test_signed_token_expiry_and_tamper():
    case_id = "test-case-uuid-123"
    file_path = "evidence/test.png"
    
    token = generate_signed_evidence_token(case_id, file_path, expiry_seconds=60)
    assert verify_signed_evidence_token(case_id, file_path, token) is True

    # Tampered case_id must fail
    assert verify_signed_evidence_token("wrong-case-uuid", file_path, token) is False

    # Expired token simulation
    expired_token = generate_signed_evidence_token(case_id, file_path, expiry_seconds=-10)
    assert verify_signed_evidence_token(case_id, file_path, expired_token) is False

@pytest.mark.asyncio
async def test_image_detector_calibration():
    # Create simple in-memory PNG
    img = Image.new("RGB", (100, 100), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data = buf.getvalue()

    result = await forensic_detector.analyze_image(data, "test.png")
    
    # Must never be 0% or 100% absolute certainty
    assert result.calibrated_confidence > 0.0
    assert result.calibrated_confidence < 100.0
    assert result.confidence_interval_low < result.confidence_interval_high
    assert result.verdict in ["likely_authentic", "inconclusive", "likely_ai_generated"]
    assert result.heatmap_bytes is not None

@pytest.mark.asyncio
async def test_text_detector_warning_and_calibration():
    sample_text = (
        "Furthermore, it is important to note that the suspect arrived at the premises at precisely midnight. "
        "Moreover, in conclusion, the testimony provided aligns with subsequent investigative developments."
    )
    result = await forensic_detector.analyze_text(sample_text)
    assert result.verdict in ["likely_authentic", "inconclusive", "likely_ai_generated"]
    assert "ADVISORY" in result.notes

def test_pdf_report_generation():
    init_db()
    case = CaseRecord(
        id=str(uuid.uuid4()),
        case_number="TEST-CASE-9999",
        officer_id="test-officer-id",
        officer_name="Det. Miller",
        officer_badge="DET-9921",
        department="Robbery-Homicide Division",
        media_type="image",
        file_name="security_frame.png",
        source_url=None,
        storage_path=None,
        file_size_bytes=102400,
        sha256_hash="abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        mime_type="image/png",
        verdict="likely_ai_generated",
        calibrated_confidence=84.2,
        confidence_interval_low=77.5,
        confidence_interval_high=90.9,
        per_detector_scores=PerDetectorScores(
            pixel_patterns=89.0,
            face_lighting=80.0,
            metadata_exif=75.0,
            breakdown=[]
        ),
        model_name="DeepTrace-Ensemble-Core",
        model_version="v2.4-hybrid",
        known_error_rate_fpr=4.20,
        known_error_rate_fnr=6.80,
        limitations_notes="Test forensic note.",
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat()
    )

    pdf_bytes = generate_case_pdf(case)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")
