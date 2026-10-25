#!/usr/bin/env python3
"""
CLI wrapper for DeepTrace forensic PDF report generation.
Usage: python backend/generate_report_cli.py <input_case_json_path> <output_pdf_path> [original_image_path] [heatmap_image_path]
"""

import sys
import os
import json

# Ensure backend root is on path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.reports.pdf_generator import generate_case_pdf
from app.db.models import CaseRecord, PerDetectorScores, DetectorBreakdown

def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_report_cli.py <case_json_path> <output_pdf_path> [orig_img] [hm_img]", file=sys.stderr)
        sys.exit(1)

    case_json_path = sys.argv[1]
    output_pdf_path = sys.argv[2]
    orig_img = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] and os.path.exists(sys.argv[3]) else None
    hm_img = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] and os.path.exists(sys.argv[4]) else None

    with open(case_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Normalize per_detector_scores
    raw_pds = data.get("per_detector_scores") or {}
    breakdown_raw = raw_pds.get("breakdown") or []
    breakdown_items = []
    for b in breakdown_raw:
        if isinstance(b, dict):
            breakdown_items.append(DetectorBreakdown(
                name=b.get("name", "Detector"),
                category=b.get("category", "pixel_patterns"),
                score=float(b.get("score", 50.0)),
                weight=float(b.get("weight", 0.33)),
                flagged=bool(b.get("flagged", False)),
                status=b.get("status", "Analyzed"),
                detail=b.get("detail", "")
            ))

    pds = PerDetectorScores(
        pixel_patterns=float(raw_pds.get("pixel_patterns", 50.0)),
        face_lighting=float(raw_pds.get("face_lighting", 50.0)),
        metadata_exif=float(raw_pds.get("metadata_exif", 50.0)),
        breakdown=breakdown_items,
        in_text_metadata=raw_pds.get("in_text_metadata") or raw_pds.get("inTextMetadata"),
        inTextMetadata=raw_pds.get("inTextMetadata") or raw_pds.get("in_text_metadata")
    )

    case = CaseRecord(
        id=data.get("id", "CASE-UNKNOWN"),
        case_number=data.get("case_number", "CASE-UNKNOWN"),
        officer_id=data.get("officer_id", "goog-admin"),
        officer_name=data.get("officer_name", "Authorized Forensic Examiner"),
        officer_badge=data.get("officer_badge", "GOOG-OFFICER"),
        department=data.get("department", "Cyber Forensics & Evidence Unit"),
        media_type=data.get("media_type", "image"),
        file_name=data.get("file_name") or data.get("source_url") or "evidence_file",
        source_url=data.get("source_url"),
        storage_path=data.get("storage_path", ""),
        file_size_bytes=int(data.get("file_size_bytes") or 0),
        sha256_hash=data.get("sha256_hash", "0" * 64),
        mime_type=data.get("mime_type", "application/octet-stream"),
        verdict=data.get("verdict", "inconclusive"),
        calibrated_confidence=float(data.get("calibrated_confidence", 50.0)),
        confidence_interval_low=float(data.get("confidence_interval_low", 45.0)),
        confidence_interval_high=float(data.get("confidence_interval_high", 55.0)),
        per_detector_scores=pds,
        heatmap_url=data.get("heatmap_url"),
        heatmap_path=data.get("heatmap_path"),
        media_url=data.get("media_url"),
        timeline_scores=data.get("timeline_scores") or [],
        text_snippet=data.get("text_snippet"),
        model_name=data.get("model_name", "TruthLens Multi-Modal Ensemble"),
        model_version=data.get("model_version", "v4.3-calibrated"),
        known_error_rate_fpr=float(data.get("known_error_rate_fpr", 3.2)),
        known_error_rate_fnr=float(data.get("known_error_rate_fnr", 4.8)),
        limitations_notes=data.get("limitations_notes", "Automated forensic evaluation."),
        created_at=data.get("created_at", ""),
        updated_at=data.get("updated_at", "")
    )

    pdf_bytes = generate_case_pdf(case, original_image_path=orig_img, heatmap_image_path=hm_img)

    with open(output_pdf_path, "wb") as f:
        f.write(pdf_bytes)

    print(f"OK: Generated {len(pdf_bytes)} bytes to {output_pdf_path}")

if __name__ == "__main__":
    main()
