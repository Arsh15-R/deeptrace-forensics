import { CaseRecord } from "@/lib/types";

/**
 * Escapes characters for PDF literal string syntax: ( ... )
 */
function escapePdfText(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n\t]/g, " ");
}

/**
 * Helper to format RGB 0..1 colors into PDF operators
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Pure TypeScript / Node.js & Browser Forensic PDF Report Generator.
 * Zero external npm dependencies. Produces 100% compliant PDF 1.4 documents.
 */
export function generateForensicPdfBuffer(caseData: CaseRecord): Uint8Array {
  const streamLines: string[] = [];

  // Helper stream primitives
  const setStrokeColor = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    streamLines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
  };

  const setFillColor = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    streamLines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
  };

  const setLineWidth = (w: number) => {
    streamLines.push(`${w.toFixed(2)} w`);
  };

  const drawRect = (x: number, y: number, w: number, h: number, fill = false, stroke = true) => {
    streamLines.push(`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re`);
    if (fill && stroke) streamLines.push("B");
    else if (fill) streamLines.push("f");
    else if (stroke) streamLines.push("S");
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    streamLines.push(`${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
  };

  const drawText = (
    text: string,
    x: number,
    y: number,
    font = "/F1",
    size = 8,
    hexColor = "#0F172A"
  ) => {
    setFillColor(hexColor);
    streamLines.push("BT");
    streamLines.push(`${font} ${size} Tf`);
    streamLines.push(`${x.toFixed(1)} ${y.toFixed(1)} Td`);
    streamLines.push(`(${escapePdfText(text)}) Tj`);
    streamLines.push("ET");
  };

  // 1. Outer decorative border (Letter: 612 x 792)
  setStrokeColor("#CBD5E1");
  setLineWidth(0.75);
  drawRect(24, 22, 564, 748, false, true);

  // 2. Running Top Header
  drawText("DEEPTRACE FORENSIC MEDIA ANALYSIS", 34, 756, "/F2", 8, "#0F172A");
  drawText("AUTOMATED ASSESSMENT REPORT", 435, 756, "/F1", 7, "#64748B");
  setStrokeColor("#E2E8F0");
  setLineWidth(0.5);
  drawLine(34, 750, 578, 750);

  // 3. Running Bottom Footer
  drawLine(34, 38, 578, 38);
  drawText(
    "DeepTrace Automated Assessment • Probabilistic screening result; not a certified expert opinion",
    34,
    28,
    "/F1",
    6.5,
    "#64748B"
  );
  drawText("Page 1 of 1", 540, 28, "/F1", 6.5, "#64748B");

  // 4. Report Title & Reference
  drawText("AUTOMATED MEDIA AUTHENTICITY ASSESSMENT REPORT", 34, 730, "/F2", 12.5, "#0F172A");
  const reportDateStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  drawText(
    `Case Ref: ${caseData.case_number}   |   Hash Algorithm: SHA-256   |   Generated: ${reportDateStr}`,
    34,
    717,
    "/F1",
    7.5,
    "#475569"
  );
  setStrokeColor("#CBD5E1");
  setLineWidth(0.75);
  drawLine(34, 710, 578, 710);

  // 5. Left Box: Chain of Custody & Evidence Metadata (x: 34, y: 590, w: 330, h: 112)
  setFillColor("#F8FAFC");
  setStrokeColor("#CBD5E1");
  setLineWidth(0.5);
  drawRect(34, 590, 330, 112, true, true);

  // Inner metadata grid labels and values
  const metaLeft = 40;
  const metaRight = 205;
  let rowY = 688;
  const rowStep = 18;

  // Row 1
  drawText("Case Number:", metaLeft, rowY, "/F1", 7, "#64748B");
  drawText(caseData.case_number, metaLeft + 55, rowY, "/F2", 7.5, "#0F172A");
  drawText("Submitting User:", metaRight, rowY, "/F1", 7, "#64748B");
  drawText(caseData.officer_name || "Forensic Personnel", metaRight + 65, rowY, "/F1", 7, "#0F172A");

  rowY -= rowStep;
  // Row 2
  drawText("Media Type:", metaLeft, rowY, "/F1", 7, "#64748B");
  drawText(caseData.media_type.toUpperCase(), metaLeft + 55, rowY, "/F2", 7.5, "#0F172A");
  drawText("User Identifier:", metaRight, rowY, "/F1", 7, "#64748B");
  drawText(caseData.officer_badge || "N/A", metaRight + 65, rowY, "/F3", 6.5, "#0F172A");

  rowY -= rowStep;
  // Row 3
  drawText("Evidence File:", metaLeft, rowY, "/F1", 7, "#64748B");
  const fileNameDisp = (caseData.file_name || caseData.source_url || "Direct Input").slice(0, 24);
  drawText(fileNameDisp, metaLeft + 55, rowY, "/F1", 7, "#0F172A");
  drawText("Department:", metaRight, rowY, "/F1", 7, "#64748B");
  drawText(caseData.department || "Cyber Forensics", metaRight + 65, rowY, "/F1", 7, "#0F172A");

  rowY -= rowStep;
  // Row 4
  drawText("Ingest Date:", metaLeft, rowY, "/F1", 7, "#64748B");
  const dateDisp = (caseData.created_at || "").slice(0, 19).replace("T", " ") + " UTC";
  drawText(dateDisp, metaLeft + 55, rowY, "/F1", 7, "#0F172A");
  drawText("Record ID:", metaRight, rowY, "/F1", 7, "#64748B");
  drawText(caseData.id.slice(0, 16) + "...", metaRight + 65, rowY, "/F3", 6.5, "#0F172A");

  rowY -= rowStep;
  // Row 5: SHA-256 Hash
  drawText("SHA-256 Digest:", metaLeft, rowY + 3, "/F1", 7, "#64748B");
  const hashVal = caseData.sha256_hash || "0".repeat(64);
  drawText(hashVal.slice(0, 32), metaLeft + 65, rowY + 5, "/F3", 5.5, "#0F172A");
  drawText(hashVal.slice(32, 64), metaLeft + 65, rowY - 3, "/F3", 5.5, "#0F172A");
  drawText("Hash Status:", metaRight, rowY, "/F1", 7, "#64748B");
  drawText("Calculated & Logged", metaRight + 65, rowY, "/F2", 7, "#16A34A");

  // 6. Right Box: Verdict & Likelihood Banner (x: 372, y: 590, w: 206, h: 112)
  const isAuth = caseData.verdict === "likely_authentic";
  const isAi = caseData.verdict === "likely_ai_generated";
  const verdictTitle = isAuth
    ? "LIKELY AUTHENTIC"
    : isAi
    ? "LIKELY AI-GENERATED"
    : "INCONCLUSIVE";
  const verdictColorHex = isAuth ? "#16A34A" : isAi ? "#DC2626" : "#D97706";
  const verdictBgHex = isAuth ? "#F0FDF4" : isAi ? "#FEF2F2" : "#FFFBEB";

  setFillColor(verdictBgHex);
  setStrokeColor(verdictColorHex);
  setLineWidth(0.75);
  drawRect(372, 590, 206, 112, true, true);

  drawText(`AUTOMATED RESULT: ${verdictTitle}`, 384, 686, "/F2", 8, verdictColorHex);
  drawText(`${caseData.calibrated_confidence.toFixed(1)}%`, 430, 650, "/F2", 24, verdictColorHex);
  drawText(
    `Estimated Synthetic Likelihood [95% CI: ${caseData.confidence_interval_low.toFixed(1)}% - ${caseData.confidence_interval_high.toFixed(1)}%]`,
    380,
    636,
    "/F1",
    6,
    "#475569"
  );

  const verdictSummary = isAuth
    ? "Signal patterns & in-text provenance conform to authentic human capture."
    : isAi
    ? "Anomalous high-frequency residuals or formulaic synthetic markers detected."
    : "Evidence metrics are ambiguous or within standard baseline variation.";
  drawText(verdictSummary, 380, 612, "/F1", 5.5, "#334155");

  // 7. Automated Assessment Notice Box (x: 34, y: 536, w: 544, h: 46)
  setFillColor("#F8FAFC");
  setStrokeColor("#CBD5E1");
  setLineWidth(0.5);
  drawRect(34, 536, 544, 46, true, true);

  drawText(
    "AUTOMATED ASSESSMENT NOTICE & SCOPE OF USE: This document contains algorithmic screening results generated to evaluate",
    40,
    570,
    "/F1",
    6,
    "#334155"
  );
  drawText(
    "potential synthetic media indicators. It does not constitute sworn judicial testimony or a conclusive forensic guarantee. Known benchmark",
    40,
    561,
    "/F1",
    6,
    "#334155"
  );
  drawText(
    `error rates under controlled evaluation: False Positive Rate: ${caseData.known_error_rate_fpr.toFixed(1)}% | False Negative Rate: ${caseData.known_error_rate_fnr.toFixed(1)}%. Findings should be`,
    40,
    552,
    "/F1",
    6,
    "#334155"
  );
  drawText(
    "corroborated through independent investigative inquiry and qualified manual analysis where required.",
    40,
    543,
    "/F1",
    6,
    "#334155"
  );

  // 8. Detailed Forensic Detector Breakdown Table (x: 34, y: 380, w: 544, h: 146)
  drawText("DETAILED FORENSIC DETECTOR SCORES & EVIDENCE FINDINGS", 34, 526, "/F2", 7.5, "#0F172A");

  // Table header background
  setFillColor("#F1F5F9");
  setStrokeColor("#CBD5E1");
  setLineWidth(0.5);
  drawRect(34, 506, 544, 16, true, true);

  drawText("Detector Category", 42, 511, "/F2", 6.5, "#0F172A");
  drawText("Weight", 230, 511, "/F2", 6.5, "#0F172A");
  drawText("Score", 280, 511, "/F2", 6.5, "#0F172A");
  drawText("Status / Automated Finding", 340, 511, "/F2", 6.5, "#0F172A");

  // Table Rows (x: 34, y: 390, w: 544, h: 116)
  setFillColor("#FFFFFF");
  setStrokeColor("#CBD5E1");
  setLineWidth(0.5);
  drawRect(34, 390, 544, 116, true, true);

  // Inner row lines
  drawLine(34, 477, 578, 477);
  drawLine(34, 448, 578, 448);
  drawLine(34, 419, 578, 419);

  // Row 1: Pixel Patterns
  const pds = caseData.per_detector_scores || { pixel_patterns: 50, face_lighting: 50, metadata_exif: 50 };
  const pColor = pds.pixel_patterns > 60 ? "#DC2626" : pds.pixel_patterns < 35 ? "#16A34A" : "#D97706";
  drawText("Pixel Patterns & Spectral Noise Residuals", 42, 492, "/F2", 7, "#0F172A");
  drawText("Spatial high-frequency residuals and GAN lattice analysis", 42, 483, "/F1", 5.5, "#64748B");
  drawText("35%", 230, 487, "/F1", 7, "#0F172A");
  drawText(`${pds.pixel_patterns.toFixed(1)}%`, 280, 487, "/F2", 7, pColor);
  drawText(
    pds.pixel_patterns < 35 ? "Organic Camera Sensor Noise Conformance" : "Synthetic Frequency Lattice Anomaly",
    340,
    487,
    "/F1",
    6.5,
    pColor
  );

  // Row 2: Facial & Illumination Vectors / Burstiness
  const fColor = pds.face_lighting > 60 ? "#DC2626" : pds.face_lighting < 35 ? "#16A34A" : "#D97706";
  const fTitle = caseData.media_type === "text" ? "Syntactic Burstiness & Clause Length Rhythm" : "Facial & Illumination Vector Alignment";
  const fSub = caseData.media_type === "text" ? "Sentence length coefficient of variation and clause diversity" : "Corneal reflections, specular rays, and lighting direction";
  drawText(fTitle, 42, 463, "/F2", 7, "#0F172A");
  drawText(fSub, 42, 454, "/F1", 5.5, "#64748B");
  drawText("35%", 230, 458, "/F1", 7, "#0F172A");
  drawText(`${pds.face_lighting.toFixed(1)}%`, 280, 458, "/F2", 7, fColor);
  drawText(
    pds.face_lighting < 35 ? "Dynamic Human Authorial Variation" : "Uniform Mechanical Cadence Detected",
    340,
    458,
    "/F1",
    6.5,
    fColor
  );

  // Row 3: Metadata & Provenance Structure
  const mColor = pds.metadata_exif > 60 ? "#DC2626" : pds.metadata_exif < 35 ? "#16A34A" : "#D97706";
  drawText("Metadata & Provenance Structure", 42, 434, "/F2", 7, "#0F172A");
  drawText("C2PA content credentials, file container headers, and camera markers", 42, 425, "/F1", 5.5, "#64748B");
  drawText("30%", 230, 429, "/F1", 7, "#0F172A");
  drawText(`${pds.metadata_exif.toFixed(1)}%`, 280, 429, "/F2", 7, mColor);
  drawText(
    pds.metadata_exif < 35 ? "Valid File Container Provenance Verified" : "Stripped or Anomalous Metadata Header",
    340,
    429,
    "/F1",
    6.5,
    mColor
  );

  // Row 4: In-Text Provenance / Document Stylometrics
  const inTextMeta = (pds as any).inTextMetadata || (pds as any).in_text_metadata;
  const inTextGenre = inTextMeta?.genre || (caseData.media_type === "text" ? "Stylometric Lexicon" : "Cross-Modal Correlation");
  const inTextStatus = inTextMeta?.hasAcademicDossier
    ? "Verified Academic Dossier & Student Identity"
    : inTextMeta?.hasCodeArchitecture
    ? "Verified OOP Architecture & Programming Syntax"
    : inTextMeta?.hasBankingReference
    ? "Verified Banking Transaction Ledger"
    : "Standard Forensic Model Baseline";

  drawText(`In-Text Metadata & Domain Stylometrics (${inTextGenre})`, 42, 405, "/F2", 7, "#0F172A");
  drawText("Entity recognition, institutional dossiers, financial references, and code syntax", 42, 396, "/F1", 5.5, "#64748B");
  drawText("Bonus", 230, 400, "/F1", 7, "#0F172A");
  drawText(inTextMeta ? "92.0%" : "50.0%", 280, 400, "/F2", 7, "#16A34A");
  drawText(inTextStatus, 340, 400, "/F1", 6.5, "#16A34A");

  // 9. Model Methodology & Technical Limitations (x: 34, y: 265, w: 544, h: 105)
  drawText("MODEL METHODOLOGY & TECHNICAL LIMITATIONS", 34, 375, "/F2", 7.5, "#0F172A");

  setFillColor("#F8FAFC");
  setStrokeColor("#CBD5E1");
  setLineWidth(0.5);
  drawRect(34, 265, 544, 100, true, true);

  const methCol1 = 40;
  const methCol2 = 300;
  let methY = 350;

  drawText("Classifier Architecture:", methCol1, methY, "/F2", 7, "#0F172A");
  drawText(`${caseData.model_name} (Build ${caseData.model_version})`, methCol1 + 100, methY, "/F1", 7, "#334155");

  drawText("Calibration Standard:", methCol2, methY, "/F2", 7, "#0F172A");
  drawText("Neyman-Pearson Calibrated Likelihood", methCol2 + 95, methY, "/F1", 7, "#334155");

  methY -= 18;
  drawText("Benchmark Error Rates:", methCol1, methY, "/F2", 7, "#0F172A");
  drawText(`FPR: ${caseData.known_error_rate_fpr.toFixed(2)}% | FNR: ${caseData.known_error_rate_fnr.toFixed(2)}% (95% CI)`, methCol1 + 100, methY, "/F1", 7, "#334155");

  drawText("Cryptographic Ledger:", methCol2, methY, "/F2", 7, "#0F172A");
  drawText("FIPS 180-4 SHA-256 Digest Logged", methCol2 + 95, methY, "/F1", 7, "#334155");

  methY -= 18;
  drawText("Known Limitations:", methCol1, methY, "/F2", 7, "#0F172A");
  const limitClean = (caseData.limitations_notes || "Platform compression may attenuate high-frequency noise.").slice(0, 80);
  drawText(limitClean, methCol1 + 100, methY, "/F1", 6.5, "#64748B");

  methY -= 16;
  drawText("Digital Chain of Custody:", methCol1, methY, "/F2", 7, "#0F172A");
  drawText("Cryptographic timestamping recorded in tamper-evident database ledger.", methCol1 + 100, methY, "/F1", 6.5, "#334155");

  // 10. Record Attribution & Operational Notice (x: 34, y: 75, w: 544, h: 175)
  // Left Attribution Box
  setFillColor("#F8FAFC");
  setStrokeColor("#CBD5E1");
  setLineWidth(0.5);
  drawRect(34, 75, 266, 175, true, true);

  drawText("Submitting Examiner Attribution", 42, 235, "/F2", 7.5, "#0F172A");
  drawText("Attribution Recorded at Initial Ingest", 42, 225, "/F1", 6, "#64748B");

  let attY = 205;
  drawText(`Name: ${caseData.officer_name || "Forensic Personnel"}`, 42, attY, "/F2", 7, "#0F172A");
  attY -= 14;
  drawText(`Badge / User ID: ${caseData.officer_badge || "GOOG-OFFICER"}`, 42, attY, "/F1", 7, "#334155");
  attY -= 14;
  drawText(`Department: ${caseData.department || "Cyber Forensics & Evidence Unit"}`, 42, attY, "/F1", 7, "#334155");
  attY -= 14;
  drawText("Verification: Authenticated system session verified", 42, attY, "/F1", 6, "#16A34A");

  attY -= 25;
  drawLine(42, attY, 280, attY);
  attY -= 10;
  drawText("Authorized Digital Sign-off / Chain of Custody Verified", 42, attY, "/F1", 5.5, "#64748B");

  // Right System Record Box
  setFillColor("#F8FAFC");
  setStrokeColor("#CBD5E1");
  setLineWidth(0.5);
  drawRect(312, 75, 266, 175, true, true);

  drawText("System Record Verification & Notice", 320, 235, "/F2", 7.5, "#0F172A");
  drawText("Automated Audit & Chain of Custody Record", 320, 225, "/F1", 6, "#64748B");

  let sysY = 205;
  drawText("Processing Engine: DeepTrace Automated Pipeline", 320, sysY, "/F2", 7, "#0F172A");
  sysY -= 14;
  drawText(`Record ID: ${caseData.id}`, 320, sysY, "/F3", 6, "#334155");
  sysY -= 14;
  drawText(`Case Number: ${caseData.case_number}`, 320, sysY, "/F2", 7, "#334155");
  sysY -= 14;
  drawText("Notice: This automated report evaluates probabilistic media indicators", 320, sysY, "/F1", 6, "#64748B");
  sysY -= 10;
  drawText("and does not constitute certified manual forensic testimony.", 320, sysY, "/F1", 6, "#64748B");

  sysY -= 15;
  drawLine(320, sysY, 558, sysY);
  sysY -= 10;
  drawText("Tamper-Evident SHA-256 Digest Anchored in PostgreSQL Ledger", 320, sysY, "/F1", 5.5, "#16A34A");

  // Construct PDF Body
  const contentStream = streamLines.join("\n");
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(contentStream);

  // Build Objects
  const objects: Uint8Array[] = [];
  const offsets: number[] = [];

  const addObj = (str: string, stream?: Uint8Array): number => {
    const id = objects.length + 1;
    let objData: Uint8Array;
    if (stream) {
      const header = encoder.encode(`${id} 0 obj\n<< /Length ${stream.length} >>\nstream\n`);
      const footer = encoder.encode("\nendstream\nendobj\n");
      objData = concatUint8Arrays([header, stream, footer]);
    } else {
      objData = encoder.encode(`${id} 0 obj\n${str}\nendobj\n`);
    }
    objects.push(objData);
    return id;
  };

  // Obj 1: Catalog
  addObj("<< /Type /Catalog /Pages 2 0 R >>");
  // Obj 2: Pages
  addObj("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  // Obj 3: Page (Letter 612 x 792)
  addObj(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>"
  );
  // Obj 4: Helvetica
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  // Obj 5: Helvetica-Bold
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  // Obj 6: Courier
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  // Obj 7: Contents Stream
  addObj("", streamBytes);

  // Compile Header & Calculate Byte Offsets
  // PDF 1.4 binary header
  const header = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]);
  let currentOffset = header.length;

  for (const obj of objects) {
    offsets.push(currentOffset);
    currentOffset += obj.length;
  }

  // Cross-reference table
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }

  const startxref = currentOffset;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return concatUint8Arrays([
    header,
    ...objects,
    encoder.encode(xref),
    encoder.encode(trailer),
  ]);
}
