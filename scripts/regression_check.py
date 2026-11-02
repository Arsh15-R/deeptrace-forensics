#!/usr/bin/env python3
"""
DeepTrace Forensics — Regression Check
Validates that genuine photos captured via screenshots or re-compression
are NOT erroneously classified as 'Likely AI-Generated' (>65.0% synthetic likelihood).
Exits with code 1 if any regression is detected.
"""

import os
import sys
from pathlib import Path

# Ensure backend is on PYTHONPATH
repo_root = Path(__file__).resolve().parent.parent
backend_dir = repo_root / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.trained_detector import TrainedForensicDetector


def run_regression_checks() -> int:
    fixtures_dir = repo_root / "tests" / "fixtures" / "real_screenshots"
    if not fixtures_dir.exists():
        print(f"[!] Fixture directory not found: {fixtures_dir}")
        return 0

    image_paths = sorted(
        list(fixtures_dir.glob("*.jpg")) +
        list(fixtures_dir.glob("*.jpeg")) +
        list(fixtures_dir.glob("*.png")) +
        list(fixtures_dir.glob("*.webp"))
    )

    if not image_paths:
        print(f"[*] No fixtures found in {fixtures_dir}. Skipping check.")
        return 0

    print(f"[*] Running regression check on {len(image_paths)} screenshot fixtures...")
    detector = TrainedForensicDetector()
    failures = 0

    for p in image_paths:
        with open(p, "rb") as f:
            data = f.read()

        result, _ = detector.analyze(data, p.name, f"REG-{p.stem}")
        score = result.suspicion_score

        print(f"  -> {p.name:<35} | Score: {score:5.1f}% | Verdict: {result.assessment}")

        # The bug that initiated this was a genuine photo screenshot flagged at 96% (>65%)
        if score > 65.0:
            print(f"     [FAIL] Genuine photo screenshot flagged as synthetic (>65% threshold): {score:.1f}%")
            failures += 1

    if failures > 0:
        print(f"\n[ERROR] Regression check failed with {failures} false positive(s)!")
        return 1

    print(f"\n[SUCCESS] All {len(image_paths)} real screenshot fixtures passed without false positive flagging.")
    return 0


if __name__ == "__main__":
    sys.exit(run_regression_checks())
