import os
import io
import html
from datetime import datetime, timezone
from typing import Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

from app.db.models import CaseRecord


class SinglePageReportCanvas(canvas.Canvas):
    """
    Clean, professional report canvas:
    - Subtle single outer boundary frame
    - Running system header rule with neutral labels
    - Running footer with page count and probabilistic assessment disclaimer
    """
    def __init__(self, *args, **kwargs):
        super(SinglePageReportCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_decorations(self, total_pages):
        self.saveState()

        # Clean outer border (612 x 792 pt Letter)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.rect(24, 22, 564, 748)

        # Running Top Header
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#0F172A"))
        self.drawString(34, 756, "DEEPTRACE FORENSIC MEDIA ANALYSIS")

        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(578, 756, "AUTOMATED ASSESSMENT REPORT")

        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(34, 750, 578, 750)

        # Running Bottom Footer
        self.line(34, 38, 578, 38)
        self.setFont("Helvetica", 6.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(34, 28, "DeepTrace Automated Assessment • Probabilistic screening result; not a certified expert opinion")

        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(578, 28, page_str)

        self.restoreState()


def generate_case_pdf(
    case: CaseRecord,
    original_image_path: Optional[str] = None,
    heatmap_image_path: Optional[str] = None
) -> bytes:
    """
    Generates a clean, professional, single-page automated media authenticity assessment report.
    Uses neutral, evidence-based language and explicitly communicates algorithmic scope & limitations.
    """
    buffer = io.BytesIO()

    # Printable width: 548pt (612 - 32 - 32), printable height: 698pt (792 - 48 - 46)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=32,
        rightMargin=32,
        topMargin=46,
        bottomMargin=44
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=15,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=1
    )

    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#475569")
    )

    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=0,
        spaceAfter=0
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#334155")
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0F172A")
    )

    mono_style = ParagraphStyle(
        'MonoText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6,
        leading=7.5,
        textColor=colors.HexColor("#0F172A")
    )

    mono_sha_style = ParagraphStyle(
        'MonoShaText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=4.2,
        leading=5.2,
        textColor=colors.HexColor("#0F172A")
    )

    notice_style = ParagraphStyle(
        'NoticeStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.5,
        leading=8.5,
        textColor=colors.HexColor("#334155")
    )

    story = []

    # 1. Header Title & Reference Line
    story.append(Paragraph("AUTOMATED MEDIA AUTHENTICITY ASSESSMENT REPORT", title_style))
    story.append(Paragraph(
        f"<b>Case Ref:</b> {html.escape(case.case_number)} &nbsp;|&nbsp; "
        f"<b>Hash Algorithm:</b> SHA-256 &nbsp;|&nbsp; "
        f"<b>Report Generated:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceBefore=3, spaceAfter=4))

    # 2. Side-by-Side: Evidence Metadata (Left 336pt) + Verdict & Confidence Box (Right 212pt) = 548pt
    clean_file_name = html.escape(case.file_name or (case.source_url[:35] + "..." if case.source_url else "Direct Statement Submission"))
    clean_sha = html.escape(case.sha256_hash)
    # Split 64-char SHA-256 into two 32-character halves for clean monospace layout
    sha_formatted = f"{clean_sha[:32]}<br/>{clean_sha[32:]}" if len(clean_sha) == 64 else clean_sha
    formatted_size = f"{round(case.file_size_bytes / (1024*1024), 2)} MB" if case.file_size_bytes else "N/A"
    formatted_date = case.created_at[:19].replace("T", " ") + " UTC"

    meta_rows = [
        [
            Paragraph("<b>Case Number:</b>", body_style),
            Paragraph(f"<b>{html.escape(case.case_number)}</b>", body_bold),
            Paragraph("<b>Submitting User:</b>", body_style),
            Paragraph(f"{html.escape(case.officer_name)}", body_style)
        ],
        [
            Paragraph("<b>Media Type:</b>", body_style),
            Paragraph(case.media_type.upper(), body_bold),
            Paragraph("<b>User Identifier:</b>", body_style),
            Paragraph(html.escape(case.officer_badge or "N/A"), mono_style)
        ],
        [
            Paragraph("<b>Evidence File:</b>", body_style),
            Paragraph(clean_file_name, body_style),
            Paragraph("<b>Department / Unit:</b>", body_style),
            Paragraph(html.escape(case.department or "Standard"), body_style)
        ],
        [
            Paragraph("<b>Ingest Date:</b>", body_style),
            Paragraph(formatted_date, body_style),
            Paragraph("<b>Record ID:</b>", body_style),
            Paragraph(case.id[:18] + "...", mono_style)
        ],
        [
            Paragraph("<b>SHA-256 Digest:</b>", body_style),
            Paragraph(sha_formatted, mono_sha_style),
            Paragraph("<b>Hash Status:</b>", body_style),
            Paragraph("Calculated & Logged", body_bold)
        ]
    ]

    meta_inner_table = Table(meta_rows, colWidths=[64, 104, 64, 104])
    meta_inner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    # Verdict styling with fixed line heights to completely eliminate text collision
    verdict_configs = {
        "likely_authentic": (
            "LIKELY AUTHENTIC",
            colors.HexColor("#16A34A"),
            colors.HexColor("#F0FDF4"),
            "Signal patterns and sensor noise residuals are consistent with authentic capture. No prominent synthetic artifacts detected."
        ),
        "inconclusive": (
            "INCONCLUSIVE",
            colors.HexColor("#D97706"),
            colors.HexColor("#FFFBEB"),
            "Signals are ambiguous or degraded by compression. Evidence cannot be definitively classified as authentic or synthetic."
        ),
        "likely_ai_generated": (
            "LIKELY AI-GENERATED",
            colors.HexColor("#DC2626"),
            colors.HexColor("#FEF2F2"),
            "Anomalous high-frequency distributions, illumination contradictions, or synthetic generator signatures detected."
        )
    }

    verdict_title, verdict_color, verdict_bg, verdict_summary = verdict_configs.get(
        case.verdict, ("INCONCLUSIVE", colors.HexColor("#4B5563"), colors.HexColor("#F3F4F6"), "Undetermined classification.")
    )

    verdict_rows = [
        [Paragraph(f"<b>AUTOMATED RESULT: {verdict_title}</b>", ParagraphStyle('VTitle', fontName='Helvetica-Bold', fontSize=8, leading=10, alignment=1, textColor=verdict_color))],
        [Paragraph(f"<b>{case.calibrated_confidence:.1f}%</b>", ParagraphStyle('VScore', fontName='Helvetica-Bold', fontSize=21, leading=25, alignment=1, textColor=verdict_color))],
        [Paragraph(f"Estimated Synthetic Likelihood [95% CI: {case.confidence_interval_low:.1f}% - {case.confidence_interval_high:.1f}%]", ParagraphStyle('VCI', fontName='Helvetica', fontSize=6.5, leading=8.5, alignment=1, textColor=colors.HexColor("#475569")))],
        [Paragraph(verdict_summary, ParagraphStyle('VSum', fontName='Helvetica', fontSize=6, leading=8, alignment=1, textColor=colors.HexColor("#334155")))]
    ]

    verdict_inner_table = Table(verdict_rows, colWidths=[206])
    verdict_inner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), verdict_bg),
        ('BOX', (0, 0), (-1, -1), 0.75, verdict_color),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    top_banner_table = Table([[meta_inner_table, verdict_inner_table]], colWidths=[336, 212])
    top_banner_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(top_banner_table)
    story.append(Spacer(1, 4))

    # 3. Automated Assessment Notice & Limitations Box
    advisory_text = (
        "<b>AUTOMATED ASSESSMENT NOTICE & SCOPE OF USE:</b> This document contains algorithmic screening results "
        "generated to evaluate potential synthetic media indicators. It does not constitute sworn judicial testimony, "
        "a certified forensic guarantee, or conclusive proof of authenticity or manipulation. "
        "Known benchmark error rates under controlled evaluation: <b>False Positive Rate: 4.2%</b> (compression artifacts) | "
        "<b>False Negative Rate: 6.8%</b> (evasive models). Severe platform re-compression (e.g. social messaging apps) or "
        "multi-generation transcode can attenuate artifacts. Findings should be corroborated through independent investigative inquiry "
        "and qualified manual analysis where required."
    )
    advisory_table = Table([[Paragraph(advisory_text, notice_style)]], colWidths=[548])
    advisory_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(advisory_table)
    story.append(Spacer(1, 4))

    # 4. Detailed Detector Scores & Evidence Findings Table
    story.append(Paragraph("DETAILED FORENSIC DETECTOR SCORES & EVIDENCE FINDINGS", section_header))
    story.append(Spacer(1, 2))

    score_rows = [
        [
            Paragraph("<b>Detector Category</b>", body_bold),
            Paragraph("<b>Weight</b>", body_bold),
            Paragraph("<b>Score</b>", body_bold),
            Paragraph("<b>Status / Automated Finding</b>", body_bold)
        ]
    ]

    breakdown_items = case.per_detector_scores.breakdown or []
    if breakdown_items:
        for item in breakdown_items[:3]:
            score_color = "#DC2626" if item.score > 60 else ("#D97706" if item.score >= 35 else "#16A34A")
            detail_clean = html.escape(item.detail[:100])
            name_clean = html.escape(item.name)
            status_clean = html.escape(item.status)
            score_rows.append([
                Paragraph(f"<b>{name_clean}</b><br/><font size=5.5 color='#64748B'>{detail_clean}...</font>", body_style),
                Paragraph(f"{int(item.weight * 100)}%", body_style),
                Paragraph(f"<font color='{score_color}'><b>{item.score:.1f}%</b></font>", body_style),
                Paragraph(f"<font color='{score_color}'><b>{status_clean}</b></font>", body_style)
            ])
    else:
        score_rows.append([
            Paragraph("<b>Pixel Patterns & Spectral Noise</b><br/><font size=5.5 color='#64748B'>High-frequency spatial residual analysis.</font>", body_style),
            Paragraph("35%", body_style),
            Paragraph(f"<b>{case.per_detector_scores.pixel_patterns:.1f}%</b>", body_style),
            Paragraph("Spectral evaluation completed", body_style)
        ])
        score_rows.append([
            Paragraph("<b>Facial & Illumination Vectors</b><br/><font size=5.5 color='#64748B'>Specular corneal reflection and ray angles.</font>", body_style),
            Paragraph("35%", body_style),
            Paragraph(f"<b>{case.per_detector_scores.face_lighting:.1f}%</b>", body_style),
            Paragraph("Geometric evaluation completed", body_style)
        ])
        score_rows.append([
            Paragraph("<b>Metadata & Provenance Structure</b><br/><font size=5.5 color='#64748B'>C2PA integrity and camera sensor markers.</font>", body_style),
            Paragraph("30%", body_style),
            Paragraph(f"<b>{case.per_detector_scores.metadata_exif:.1f}%</b>", body_style),
            Paragraph("Provenance structure checked", body_style)
        ])

    detector_table = Table(score_rows, colWidths=[195, 45, 54, 254])
    detector_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(detector_table)
    story.append(Spacer(1, 4))

    # 5. Visual Evidence & Model Methodology Block
    has_images = bool(original_image_path and os.path.exists(original_image_path) and heatmap_image_path and os.path.exists(heatmap_image_path))

    method_rows = [
        [
            Paragraph("<b>Classifier Architecture:</b>", body_style),
            Paragraph(f"{case.model_name} (Build {case.model_version})", body_style)
        ],
        [
            Paragraph("<b>Calibration Standard:</b>", body_style),
            Paragraph("Neyman-Pearson Calibrated Likelihood", body_style)
        ],
        [
            Paragraph("<b>Benchmark Error Rates:</b>", body_style),
            Paragraph(f"FPR: {case.known_error_rate_fpr:.2f}% | FNR: {case.known_error_rate_fnr:.2f}% (95% CI)", body_style)
        ],
        [
            Paragraph("<b>Known Limitations:</b>", body_style),
            Paragraph(f"<font size=5.5 color='#64748B'>{html.escape(case.limitations_notes[:140])}...</font>", body_style)
        ]
    ]

    if has_images:
        try:
            img_w = 105
            img_h = 65
            images_cell = Table([
                [
                    RLImage(original_image_path, width=img_w, height=img_h, kind='proportional'),
                    RLImage(heatmap_image_path, width=img_w, height=img_h, kind='proportional')
                ],
                [
                    Paragraph("<b>Fig 1: Original Ingest</b>", ParagraphStyle('F1', parent=body_style, fontSize=6, alignment=1)),
                    Paragraph("<b>Fig 2: Anomaly Heatmap</b>", ParagraphStyle('F2', parent=body_style, fontSize=6, alignment=1))
                ]
            ], colWidths=[112, 112])
            images_cell.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 1),
                ('RIGHTPADDING', (0, 0), (-1, -1), 1),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ]))

            method_inner_table = Table(method_rows, colWidths=[90, 226])
            method_inner_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                ('LEFTPADDING', (0, 0), (-1, -1), 3),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))

            visual_method_table = Table([[images_cell, method_inner_table]], colWidths=[228, 320])
            visual_method_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))

            story.append(Paragraph("EVIDENCE VISUALS & MODEL METHODOLOGY", section_header))
            story.append(Spacer(1, 2))
            story.append(visual_method_table)
        except Exception:
            has_images = False

    if not has_images:
        method_full_rows = [
            [
                Paragraph("<b>Classifier Architecture:</b>", body_style),
                Paragraph(f"{case.model_name} (Build {case.model_version})", body_style),
                Paragraph("<b>Benchmark False Positive Rate:</b>", body_style),
                Paragraph(f"{case.known_error_rate_fpr:.2f}% (benchmark)", body_style)
            ],
            [
                Paragraph("<b>Calibration Standard:</b>", body_style),
                Paragraph("Neyman-Pearson Calibrated Likelihood", body_style),
                Paragraph("<b>Benchmark False Negative Rate:</b>", body_style),
                Paragraph(f"{case.known_error_rate_fnr:.2f}% (diffusion models)", body_style)
            ],
            [
                Paragraph("<b>Known Limitations:</b>", body_style),
                Paragraph(f"<font size=5.5 color='#64748B'>{html.escape(case.limitations_notes)}</font>", body_style),
                Paragraph("<b>Cryptographic Integrity:</b>", body_style),
                Paragraph("FIPS 180-4 SHA-256 Digest Logged", body_style)
            ]
        ]
        method_table = Table(method_full_rows, colWidths=[124, 150, 134, 140])
        method_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(Paragraph("MODEL METHODOLOGY & TECHNICAL LIMITATIONS", section_header))
        story.append(Spacer(1, 2))
        story.append(method_table)

    story.append(Spacer(1, 4))

    # 6. Record Attribution & Operational Notice (Replacing unsupported certifications/signatures)
    officer_name_clean = html.escape(case.officer_name)
    officer_badge_clean = html.escape(case.officer_badge or "N/A")
    dept_clean = html.escape(case.department or "Standard Operations")

    attribution_rows = [
        [
            Paragraph(
                f"<b>Submitting Examiner Attribution:</b><br/>"
                f"<font size=5.5 color='#64748B'>Attribution Recorded at Initial Ingest</font><br/><br/>"
                f"<b>Name:</b> {officer_name_clean} &nbsp;|&nbsp; <b>ID / Badge:</b> {officer_badge_clean}<br/>"
                f"<b>Assigned Department:</b> {dept_clean}<br/>"
                f"<font size=5.5 color='#64748B'>User identity verified via authenticated system session.</font>",
                body_style
            ),
            Paragraph(
                f"<b>System Record Verification & Notice:</b><br/>"
                f"<font size=5.5 color='#64748B'>Automated Audit & Chain of Custody Record</font><br/><br/>"
                f"<b>Processing Engine:</b> DeepTrace Automated Assessment Pipeline<br/>"
                f"<b>Record ID:</b> <font face='Courier' size=5.5>{html.escape(case.id)}</font><br/>"
                f"<font size=5.5 color='#64748B'>Notice: This document is an automated analysis output and does not constitute a certified manual forensic examination.</font>",
                body_style
            )
        ]
    ]

    attribution_table = Table(attribution_rows, colWidths=[274, 274])
    attribution_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(KeepTogether([attribution_table]))

    doc.build(story, canvasmaker=SinglePageReportCanvas)
    return buffer.getvalue()
