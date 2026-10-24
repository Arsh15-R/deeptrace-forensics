# DeepTrace Forensics (v2.4)
### Police Media Authenticity Verification & Evidentiary Screening System

> **Live Production Deployment:** [https://frontend-nine-beta-kezj4jzf35.vercel.app](https://frontend-nine-beta-kezj4jzf35.vercel.app)  
> **GitHub Repository:** [https://github.com/Arsh15-R/deeptrace-forensics](https://github.com/Arsh15-R/deeptrace-forensics)

DeepTrace is a full-stack digital forensic examination platform engineered specifically for law enforcement, internal affairs bureaus, and criminal justice investigators. It evaluates questioned images, surveillance videos, remote media links, and linguistic statements to estimate the probability of synthetic generation (deepfakes, generative AI diffusion models, and LLM text generation) while maintaining strict chain-of-custody integrity, calibrated uncertainty intervals, and audit logging.

---

## Key Capabilities & Evidentiary Standards

1. **Four-Channel Media Screening (Segmented Control)**
   - **Image:** Drag-and-drop / file picker for JPEG, PNG, WebP, and TIFF (up to 50 MB). Computes client-side and server-side NIST FIPS 180-4 SHA-256 hashes immediately upon ingest.
   - **Video:** Drag-and-drop / file picker for MP4, MOV, AVI, and WebM (up to 200 MB). Evaluates keyframe optical flow, temporal blinking cadences, and audio formant anomalies. Supports asynchronous Celery + Redis workers.
   - **Media Link:** Server-side ingestion protected by strict **SSRF defense** (automatically detects and blocks RFC 1918 private subnets, loopbacks, link-local, and AWS/GCP cloud metadata endpoints) with a 12-second timeout and 50 MB ceiling.
   - **Text Statement:** Evaluates transcripts and written statements for sentence burstiness, vocabulary entropy, and stylistic markers. Features a prominent reliability advisory noting higher error rates on written text.

2. **Calibrated Forensic Verdicts & Uncertainty Bounds**
   - In accordance with the **Neyman-Pearson decision rule**, results are never presented as 100% or 0% certain.
   - Three distinct categorical verdicts:
     - **Likely authentic** (<35% synthetic likelihood)
     - **Inconclusive** (35% to 65% synthetic likelihood)
     - **Likely AI-generated** (>65% synthetic likelihood)
   - Every score includes a **95% Confidence Interval band** `[CI Low% – CI High%]`.

3. **Multi-Detector Breakdown Matrix**
   - **Pixel Patterns:** High-frequency spectral residuals and Fourier power spectrum checkerboard artifacts.
   - **Facial & Illumination Vectors:** Corneal glint symmetry, specular highlights, and shadow directional physics.
   - **Metadata & EXIF Signatures:** Camera hardware sensor PRNU profiles, quantization tables, and C2PA provenance credentials.
   - **Motion Over Time:** Inter-frame facial landmark warping, blinking cadence, and optical flow continuity (video only).
   - **Audio Vocoder Forensics:** Phase vocoder discontinuity, spectral cutoff, and synthetic voice cloning frequency markers.

4. **Visual Anomaly Heatmap & Video Timeline Scrubbing**
   - **Interactive Thermal Heatmap:** Side-by-side or layered inspector with an interactive opacity blend slider (0% to 100%) highlighting localized generative artifacts.
   - **Temporal Frame Scrub Bar:** Histogram displaying synthetic anomaly spikes (such as jawline shearing or lip-sync offset) across video frames.

5. **Evidentiary PDF Report Generator**
   - Compiles an official, tamper-evident forensic PDF report via ReportLab including:
     - Case Reference & Officer Badge #
     - Submission Timestamp & Cryptographic SHA-256 Fingerprint
     - Overall Verdict with calibrated confidence intervals
     - Per-detector score weights and findings
     - Embedded original evidence & anomaly heatmap figures
     - Model build specifications, known error rates (FPR: 4.2%, FNR: 6.8%), and procedural limitations
     - Official officer and supervisory examiner signature blocks

6. **Immutable Audit Ledger & Role-Based Access Control**
   - Two distinct roles:
     - **Officer (`officer`):** Can ingest media, view their assigned cases, and download forensic reports.
     - **Supervisor / Internal Affairs (`admin`):** Department-wide access to all cases and the append-only audit trail.
   - Every file upload, case inspection, and report export is logged with officer identity, timestamp, IP address, and SHA-256 fingerprint.

---

## Design System: Apple-like Glassmorphism

- **Translucent Panels:** Frosted panels with `backdrop-filter: blur(26px) saturate(160%)`, 1px subtle borders (`border-white/50` / `border-white/10`), layered soft drop shadows.
- **Visual Hierarchy of Radii:**
  - Main Panels: `rounded-panel` (28px)
  - Subpanels & Media Cards: `rounded-subpanel` (20px)
  - Inputs & Code Blocks: `rounded-input` (14px)
  - Segmented Pills & Primary Buttons: `rounded-full` (pill)
- **Typography:** SF Pro Display & Text system stack with `-0.02em` tight tracking on headings.
- **Adaptive Appearance:** Light and dark modes automatically tracking system preference or user role.
- **Human-Made Feel:** Specific, realistic police terminology (e.g. *Case Reference*, *Chain of Custody*, *Investigative Lead Notice*, *SHA-256 Fingerprint*) without AI marketing buzzwords.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons |
| **Backend API** | FastAPI (Python 3.11), Pydantic v2, HTTPX, Uvicorn |
| **Asynchronous Worker** | Celery 5.4 + Redis 7 |
| **Database & Auth** | Supabase (PostgreSQL with RLS + Google OAuth), with persistent SQLite fallback |
| **Forensic Vision & Math** | NumPy, Pillow, Fourier FFT, Error Level Analysis (ELA) |
| **Model Inference** | PyTorch / HuggingFace swappable architecture behind `/predict` |
| **Report Generation** | ReportLab 5.0 (vector PDF generation) |

---

## Repository Structure

```
d:\deeptrace new 2.0\
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with ambient mesh and navbar
│   │   ├── page.tsx               # Primary verification dashboard & segmented control
│   │   ├── results/[id]/page.tsx  # Asymmetric forensic case results view
│   │   ├── history/page.tsx       # Searchable case history table
│   │   ├── audit/page.tsx         # Admin chain-of-custody audit viewer
│   │   ├── login/page.tsx         # Supabase / Google OAuth login portal
│   │   └── globals.css            # Tailwind directives and custom scrollbars
│   ├── components/
│   │   ├── ui/                    # GlassCard, SegmentedControl
│   │   ├── layout/                # Navbar, role switcher
│   │   ├── media-input/           # ImageUploader, VideoUploader, LinkInput, TextInput
│   │   ├── results/               # VerdictBadge, CalibratedGauge, ImageHeatmapViewer,
│   │   │                          # VideoTimelineScrubber, DetectorMatrix, EvidenceLedgerCard
│   │   ├── history/               # CaseHistoryTable
│   │   └── audit/                 # AuditLogViewer
│   ├── lib/
│   │   ├── types.ts               # Complete TypeScript forensic interfaces
│   │   ├── utils.ts               # Browser SHA-256, formatters
│   │   ├── api.ts                 # FastAPI client methods
│   │   └── supabaseClient.ts      # Supabase auth & test role profiles
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, CORS, routes, /predict endpoint
│   │   ├── config.py              # Environment configuration & limits
│   │   ├── api/
│   │   │   ├── routes_cases.py    # Media ingest, image/video/link/text analysis
│   │   │   ├── routes_media.py    # Secure evidence retrieval with signed tokens
│   │   │   ├── routes_report.py   # PDF generation & download logging
│   │   │   └── routes_audit.py    # Compliance audit log endpoints
│   │   ├── db/
│   │   │   ├── database.py        # SQLite / Postgres persistence & seed cases
│   │   │   └── models.py          # Case, Audit, and Detector schemas
│   │   ├── ml/
│   │   │   ├── detector_interface.py # Abstract ML contract
│   │   │   ├── mock_detector.py   # Spectral residual & confidence calibrator
│   │   │   └── heatmap_gen.py     # Fourier gradient / ELA RGBA overlay engine
│   │   ├── reports/
│   │   │   └── pdf_generator.py   # ReportLab forensic PDF engine
│   │   ├── tasks/
│   │   │   ├── celery_app.py      # Celery task configuration
│   │   │   └── video_worker.py    # Asynchronous video analysis task
│   │   └── utils/
│   │       ├── security.py        # SSRF IP blocking, SHA-256, signed tokens
│   │       └── auth.py            # Supabase JWT validator & role enforcement
│   ├── tests/
│   │   └── test_forensics.py      # Automated test suite (SSRF, SHA-256, Calibration, PDF)
│   ├── requirements.txt
│   └── run_backend.py
├── supabase/
│   └── schema.sql                 # Complete Postgres DDL, RLS policies, audit triggers
├── storage_vault/                 # Isolated local filesystem storage for evidence & reports
├── docker-compose.yml             # Turnkey multi-container orchestration
├── .env.example
└── README.md
```

---

## Quickstart Guide

### 1. Prerequisites
- **Node.js** v18+ and **npm** v10+
- **Python** 3.11+
- *(Optional)* **Redis** and **Docker** for containerized Celery execution

---

### 2. Run the Backend API

1. Navigate to the backend directory and install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. Run the backend server:
   ```bash
   python backend/run_backend.py
   ```
   *The FastAPI server will start at `http://127.0.0.1:8000`. On first run, it initializes the SQLite database at `storage_vault/deeptrace.db` and seeds three realistic forensic cases.*

3. Run the automated test suite:
   ```bash
   # In PowerShell:
   $env:PYTHONPATH="backend"; python -m pytest backend/tests -v
   ```

---

### 3. Run the Frontend

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   npm run dev
   ```
2. Open your browser at **`http://localhost:3000`**.

---

### 4. Running with Docker Compose

To launch the full stack (Redis, Celery Worker, FastAPI Backend, Next.js Frontend) in one command:
```bash
docker-compose up --build
```

---

## Supabase Production Configuration

To connect a production Supabase instance:
1. Open your Supabase project dashboard and execute the SQL file at:
   ```
   supabase/schema.sql
   ```
2. In your `.env` or environment configuration, supply:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Enable **Google Provider** in Supabase Auth under `Authentication > Providers > Google`.

---

## Role & Permission Hierarchy

| Feature / Action | Officer (`officer`) | Internal Affairs Supervisor (`admin`) |
|---|:---:|:---:|
| Ingest Image / Video / Link / Text | Yes | Yes |
| View Assigned Cases | Yes | Yes |
| View Other Officers' Cases | No | Yes |
| Download Forensic PDF Reports | Yes | Yes |
| Inspect Chain-of-Custody Audit Ledger | No (Restricted) | Yes |
| Re-open Past Case Records | Yes | Yes |

*Note for local evaluation: You can switch between **Det. James Vance (Officer)** and **Capt. Raymond Diaz (Admin)** at any time using the badge selector in the top-right corner of the navigation bar.*

---

## Law Enforcement Evidentiary Disclaimer

> **ADVISORY:** Output from DeepTrace Forensics represents automated technical analysis to generate **investigative leads**. It does not constitute self-authenticating proof in judicial proceedings. In accordance with departmental SOPs, all flagged findings must be corroborated by physical evidence, original device inspection, and formal testimony from a certified digital forensic examiner.
