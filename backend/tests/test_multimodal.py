import io
import numpy as np
import soundfile as sf
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.ml.image_detector import ImageDeepfakeDetector
from app.ml.audio_detector import AudioDeepfakeDetector
from app.ml.text_detector import TextDeepfakeDetector

client = TestClient(app)

def test_image_detector_synthetic_and_authentic():
    detector = ImageDeepfakeDetector()
    
    # 1. Blank natural gradient image
    img = Image.new("RGB", (256, 256), color=(120, 140, 160))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    res, heat = detector.analyze(buf.getvalue(), "photo.jpg", "TEST-IMG-1")
    
    assert res.media_type == "image"
    assert res.assessment in ["likely_manipulated", "no_strong_indicators_detected", "inconclusive"]
    assert 0.0 <= res.suspicion_score <= 100.0
    assert 0.0 <= res.model_confidence <= 100.0
    assert len(res.key_findings) > 0
    assert len(heat) > 0
    assert "HighFreqResidualRatio" in res.technical_metadata

def test_audio_detector_spectral():
    detector = AudioDeepfakeDetector()
    sr = 22050
    t = np.linspace(0, 1.5, int(sr * 1.5))
    sig = (0.3 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, sig, sr, format="WAV")
    
    res = detector.analyze(buf.getvalue(), "voice.wav", "TEST-AUD-1")
    assert res.media_type == "audio"
    assert res.assessment in ["likely_manipulated", "no_strong_indicators_detected", "inconclusive"]
    assert "EstimatedSNR" in res.technical_metadata
    assert "SpectralRolloffHz" in res.technical_metadata

def test_text_detector_stylometry():
    detector = TextDeepfakeDetector()
    sample = (
        "In conclusion, the seamless integration of artificial intelligence plays a pivotal role in modernization. "
        "Furthermore, it is crucial to remember that ethical governance remains a testament to human ingenuity. "
        "Moreover, by delving into the tapestry of digital innovation, we uncover profound insights."
    )
    res = detector.analyze(sample, "statement.txt", "TEST-TXT-1")
    assert res.media_type == "text"
    assert "BurstinessRatio" in res.technical_metadata
    assert "ShannonWordEntropy" in res.technical_metadata
    assert len(res.limitations) > 0

def test_unified_api_benchmark_endpoint():
    resp = client.get("/api/analysis/benchmark")
    assert resp.status_code == 200
    data = resp.json()
    assert "models" in data
    assert "image" in data["models"]
    assert "video" in data["models"]
    assert "audio" in data["models"]
    assert "text" in data["models"]
    assert data["models"]["image"]["metrics"]["precision"] > 0.90

def test_unified_api_job_submission():
    # Submit text statement
    resp = client.post(
        "/api/analysis/jobs",
        data={"text": "This is an official police alibi statement submitted for digital examination.", "media_type": "text"},
        headers={"x-demo-role": "officer"}
    )
    assert resp.status_code == 202
    job_data = resp.json()
    assert "jobId" in job_data
    job_id = job_data["jobId"]
    
    # Check status
    status_resp = client.get(f"/api/analysis/jobs/{job_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] in ["processing", "completed"]
