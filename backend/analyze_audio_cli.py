import os
import sys
import json

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.ml.audio_detector import AudioDeepfakeDetector

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file path provided"}))
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File not found: {file_path}"}))
        sys.exit(1)

    try:
        with open(file_path, "rb") as f:
            audio_bytes = f.read()

        filename = os.path.basename(file_path)
        detector = AudioDeepfakeDetector()
        res = detector.analyze(audio_bytes, filename, "cli_job")
        d = res.model_dump()

        suspicion = float(d.get("suspicion_score", 50.0))
        verdict = (
            "likely_ai_generated"
            if suspicion >= 60.0
            else ("inconclusive" if suspicion >= 35.0 else "likely_authentic")
        )

        breakdown = []
        for finding in d.get("key_findings", []):
            f_lower = finding.lower()
            is_spectral = "spectral" in f_lower or "cutoff" in f_lower or "nyquist" in f_lower or "decimation" in f_lower
            is_hop = "hop" in f_lower or "stride" in f_lower or "modulation" in f_lower
            is_silence = "silence" in f_lower or "zero" in f_lower or "snr" in f_lower
            is_pitch = "f0" in f_lower or "pitch" in f_lower or "jitter" in f_lower

            if is_spectral:
                name = "Upper-Shelf Nyquist Brickwall Decimation"
                category = "audio_spectral"
                status = "Neural Spectral Decimation"
            elif is_hop:
                name = "Vocoder Frame Hop & Envelope Coherence"
                category = "pixel_patterns"
                status = "Discrete Vocoder Stepping"
            elif is_silence:
                name = "Sterile Digital Silence Gating"
                category = "audio_spectral"
                status = "Synthetic Noise Floor Gating"
            elif is_pitch:
                name = "Glottal Cycle Pitch Jitter Variance"
                category = "audio_spectral"
                status = "Atypical Vocal Prosody"
            else:
                name = "Acoustic Synthesizer Signature"
                category = "audio_spectral"
                status = "Neural Voice Marker"

            breakdown.append({
                "name": name,
                "category": category,
                "score": suspicion,
                "weight": 0.45 if category == "audio_spectral" else 0.35,
                "flagged": True,
                "status": status,
                "detail": finding,
            })

        if not breakdown:
            breakdown.append({
                "name": "Natural Acoustic Room Tone & Prosody",
                "category": "audio_spectral",
                "score": suspicion,
                "weight": 0.5,
                "flagged": False,
                "status": "Continuous Acoustic Noise Floor",
                "detail": "Speech track exhibits natural acoustic room reverberation and organic dynamic inflections.",
            })

        tech_meta = {}
        for k, v in d.get("technical_metadata", {}).items():
            tech_meta[k] = str(v)

        output = {
            "verdict": verdict,
            "confidence": suspicion,
            "audioScore": suspicion if verdict == "likely_ai_generated" else min(25.0, suspicion),
            "breakdown": breakdown,
            "technical_metadata": tech_meta,
        }
        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
