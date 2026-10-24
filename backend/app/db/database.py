import sqlite3
import json
import uuid
from datetime import datetime
from typing import Optional, List, Any
from app.config import settings
from app.db.models import CaseRecord, AuditLogRecord, PerDetectorScores, VideoFrameAnalysis, UserRecord

def get_db_connection():
    """Returns a SQLite connection for the persistent local evidence vault."""
    conn = sqlite3.connect(settings.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes SQLite tables if not using direct Supabase Postgres."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Cases Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        case_number TEXT UNIQUE NOT NULL,
        officer_id TEXT NOT NULL,
        officer_name TEXT NOT NULL,
        officer_badge TEXT NOT NULL,
        department TEXT NOT NULL,
        media_type TEXT NOT NULL,
        file_name TEXT,
        source_url TEXT,
        storage_path TEXT,
        file_size_bytes INTEGER,
        sha256_hash TEXT NOT NULL,
        mime_type TEXT,
        verdict TEXT NOT NULL,
        calibrated_confidence REAL NOT NULL,
        confidence_interval_low REAL NOT NULL,
        confidence_interval_high REAL NOT NULL,
        per_detector_scores TEXT NOT NULL,
        heatmap_url TEXT,
        heatmap_path TEXT,
        media_url TEXT,
        timeline_scores TEXT,
        text_snippet TEXT,
        model_name TEXT NOT NULL,
        model_version TEXT NOT NULL,
        known_error_rate_fpr REAL NOT NULL,
        known_error_rate_fnr REAL NOT NULL,
        limitations_notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        case_id TEXT,
        case_number TEXT,
        user_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        user_role TEXT NOT NULL,
        action TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        details TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        badge_number TEXT,
        department TEXT,
        role TEXT NOT NULL DEFAULT 'viewer',
        is_active INTEGER NOT NULL DEFAULT 1,
        avatar_url TEXT,
        provider TEXT NOT NULL DEFAULT 'google',
        last_active_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_sha256 ON cases(sha256_hash);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_officer_id ON cases(officer_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_verdict ON cases(verdict);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);")
    
    conn.commit()
    conn.close()

def save_case(record: CaseRecord) -> CaseRecord:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT OR REPLACE INTO cases (
            id, case_number, officer_id, officer_name, officer_badge, department,
            media_type, file_name, source_url, storage_path, file_size_bytes,
            sha256_hash, mime_type, verdict, calibrated_confidence,
            confidence_interval_low, confidence_interval_high, per_detector_scores,
            heatmap_url, heatmap_path, media_url, timeline_scores, text_snippet,
            model_name, model_version, known_error_rate_fpr, known_error_rate_fnr,
            limitations_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record.id, record.case_number, record.officer_id, record.officer_name, record.officer_badge, record.department,
        record.media_type, record.file_name, record.source_url, record.storage_path, record.file_size_bytes,
        record.sha256_hash, record.mime_type, record.verdict, record.calibrated_confidence,
        record.confidence_interval_low, record.confidence_interval_high, record.per_detector_scores.model_dump_json(),
        record.heatmap_url, record.heatmap_path, record.media_url, json.dumps([t.model_dump() for t in record.timeline_scores]),
        record.text_snippet, record.model_name, record.model_version, record.known_error_rate_fpr,
        record.known_error_rate_fnr, record.limitations_notes, record.created_at, record.updated_at
    ))
    
    conn.commit()
    conn.close()

    try:
        from app.db.supabase_client import supabase_vault
        supabase_vault.insert_record("cases", {
            "id": record.id,
            "case_number": record.case_number,
            "officer_id": record.officer_id,
            "officer_name": record.officer_name,
            "officer_badge": record.officer_badge,
            "department": record.department,
            "media_type": record.media_type,
            "file_name": record.file_name,
            "source_url": record.source_url,
            "storage_path": record.storage_path,
            "file_size_bytes": record.file_size_bytes,
            "sha256_hash": record.sha256_hash,
            "mime_type": record.mime_type,
            "verdict": record.verdict,
            "calibrated_confidence": record.calibrated_confidence,
            "confidence_interval_low": record.confidence_interval_low,
            "confidence_interval_high": record.confidence_interval_high,
            "per_detector_scores": record.per_detector_scores.model_dump(),
            "notes": record.limitations_notes,
            "created_at": record.created_at,
            "updated_at": record.updated_at
        })
    except Exception:
        pass

    return record

def row_to_case(row: sqlite3.Row) -> CaseRecord:
    data = dict(row)
    scores_dict = json.loads(data["per_detector_scores"])
    per_detector_scores = PerDetectorScores(**scores_dict)
    
    timeline_raw = json.loads(data["timeline_scores"]) if data.get("timeline_scores") else []
    timeline = [VideoFrameAnalysis(**item) for item in timeline_raw]
    
    return CaseRecord(
        id=data["id"],
        case_number=data["case_number"],
        officer_id=data["officer_id"],
        officer_name=data["officer_name"],
        officer_badge=data["officer_badge"],
        department=data["department"],
        media_type=data["media_type"],
        file_name=data["file_name"],
        source_url=data["source_url"],
        storage_path=data["storage_path"],
        file_size_bytes=data["file_size_bytes"],
        sha256_hash=data["sha256_hash"],
        mime_type=data["mime_type"],
        verdict=data["verdict"],
        calibrated_confidence=data["calibrated_confidence"],
        confidence_interval_low=data["confidence_interval_low"],
        confidence_interval_high=data["confidence_interval_high"],
        per_detector_scores=per_detector_scores,
        heatmap_url=data["heatmap_url"],
        heatmap_path=data["heatmap_path"],
        media_url=data["media_url"],
        timeline_scores=timeline,
        text_snippet=data["text_snippet"],
        model_name=data["model_name"],
        model_version=data["model_version"],
        known_error_rate_fpr=data["known_error_rate_fpr"],
        known_error_rate_fnr=data["known_error_rate_fnr"],
        limitations_notes=data["limitations_notes"],
        created_at=data["created_at"],
        updated_at=data["updated_at"]
    )

def get_case(case_id: str) -> Optional[CaseRecord]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cases WHERE id = ? OR case_number = ?", (case_id, case_id))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return row_to_case(row)

def list_cases(
    search: Optional[str] = None,
    verdict: Optional[str] = None,
    media_type: Optional[str] = None,
    officer_id: Optional[str] = None,
    is_admin: bool = False
) -> List[CaseRecord]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM cases WHERE 1=1"
    params: List[Any] = []
    
    # Non-admin officers only view their own cases unless admin
    if not is_admin and officer_id:
        query += " AND officer_id = ?"
        params.append(officer_id)
        
    if verdict:
        query += " AND verdict = ?"
        params.append(verdict)
        
    if media_type:
        query += " AND media_type = ?"
        params.append(media_type)
        
    if search:
        search_pattern = f"%{search}%"
        query += " AND (case_number LIKE ? OR file_name LIKE ? OR sha256_hash LIKE ? OR officer_name LIKE ? OR officer_badge LIKE ?)"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])
        
    query += " ORDER BY created_at DESC LIMIT 100"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [row_to_case(r) for r in rows]

def save_audit_log(log: AuditLogRecord) -> AuditLogRecord:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO audit_logs (id, case_id, case_number, user_id, user_email, user_role, action, ip_address, user_agent, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        log.id, log.case_id, log.case_number, log.user_id, log.user_email, log.user_role,
        log.action, log.ip_address, log.user_agent, json.dumps(log.details), log.created_at
    ))
    
    conn.commit()
    conn.close()

    try:
        from app.db.supabase_client import supabase_vault
        supabase_vault.insert_record("audit_logs", {
            "id": log.id,
            "case_id": log.case_id,
            "case_number": log.case_number,
            "user_id": log.user_id,
            "user_email": log.user_email,
            "user_role": log.user_role,
            "action": log.action,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "details": log.details,
            "created_at": log.created_at
        })
    except Exception:
        pass

    return log

def delete_case(case_id: str) -> bool:
    """Permanently delete a case record by UUID or case number."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cases WHERE id = ? OR case_number = ?", (case_id, case_id))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def update_case_notes(case_id: str, notes: str) -> Optional[CaseRecord]:
    """Update case limitations or examiner notes."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat() + "Z"
    cursor.execute("""
        UPDATE cases
        SET limitations_notes = ?, updated_at = ?
        WHERE id = ? OR case_number = ?
    """, (notes, now, case_id, case_id))
    conn.commit()
    conn.close()
    return get_case(case_id)

def list_audit_logs(
    limit: int = 100,
    action: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None
) -> List[AuditLogRecord]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM audit_logs WHERE 1=1"
    params: List[Any] = []
    
    category_map = {
        "auth": ["USER_SIGN_IN", "USER_SIGN_OUT"],
        "evidence": ["EVIDENCE_UPLOADED", "EVIDENCE_VIEWED", "EVIDENCE_DOWNLOADED", "EVIDENCE_DELETED", "MEDIA_UPLOAD"],
        "cases": ["CASE_CREATED", "CASE_VIEWED", "CASE_UPDATED", "CASE_DELETED"],
        "analysis": ["ANALYSIS_STARTED", "ANALYSIS_COMPLETED", "REPORT_GENERATED", "REPORT_DOWNLOADED"],
        "access": ["USER_ROLE_PROMOTED", "USER_ROLE_DEMOTED", "USER_ROLE_CHANGED", "USER_STATUS_CHANGED", "USER_DEACTIVATED", "USER_REACTIVATED", "USER_DELETED"]
    }
    
    if category and category in category_map:
        placeholders = ",".join(["?"] * len(category_map[category]))
        query += f" AND action IN ({placeholders})"
        params.extend(category_map[category])
    elif action and action != "all":
        if "," in action:
            act_list = [a.strip() for a in action.split(",") if a.strip()]
            placeholders = ",".join(["?"] * len(act_list))
            query += f" AND action IN ({placeholders})"
            params.extend(act_list)
        else:
            query += " AND action = ?"
            params.append(action)
            
    if search and search.strip():
        s = f"%{search.strip()}%"
        query += " AND (case_number LIKE ? OR user_email LIKE ? OR action LIKE ? OR ip_address LIKE ? OR details LIKE ?)"
        params.extend([s, s, s, s, s])
        
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        d = dict(row)
        try:
            details_dict = json.loads(d["details"]) if isinstance(d["details"], str) else (d["details"] or {})
        except Exception:
            details_dict = {"raw": str(d["details"])}
            
        results.append(AuditLogRecord(
            id=d["id"],
            case_id=d["case_id"],
            case_number=d["case_number"],
            user_id=d["user_id"],
            user_email=d["user_email"],
            user_role=d["user_role"],
            action=d["action"],
            ip_address=d["ip_address"],
            user_agent=d["user_agent"],
            details=details_dict,
            created_at=d["created_at"]
        ))
    return results

def row_to_user(row: sqlite3.Row) -> UserRecord:
    d = dict(row)
    return UserRecord(
        id=d["id"],
        email=d["email"],
        full_name=d["full_name"],
        badge_number=d.get("badge_number"),
        department=d.get("department"),
        role=d.get("role", "viewer"),
        is_active=bool(d.get("is_active", 1)),
        avatar_url=d.get("avatar_url"),
        provider=d.get("provider", "google"),
        last_active_at=d.get("last_active_at", datetime.utcnow().isoformat() + "Z"),
        created_at=d.get("created_at", datetime.utcnow().isoformat() + "Z"),
        updated_at=d.get("updated_at", datetime.utcnow().isoformat() + "Z")
    )

def get_user_by_id(user_id: str) -> Optional[UserRecord]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row_to_user(row) if row else None

def get_user_by_email(email: str) -> Optional[UserRecord]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    row = cursor.fetchone()
    conn.close()
    return row_to_user(row) if row else None

def upsert_user(user: UserRecord) -> UserRecord:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat() + "Z"
    cursor.execute("""
        INSERT INTO users (id, email, full_name, badge_number, department, role, is_active, avatar_url, provider, last_active_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            full_name = excluded.full_name,
            badge_number = COALESCE(excluded.badge_number, users.badge_number),
            department = COALESCE(excluded.department, users.department),
            role = users.role, -- preserved
            is_active = users.is_active, -- preserved
            avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
            last_active_at = excluded.last_active_at,
            updated_at = excluded.updated_at
    """, (
        user.id, user.email, user.full_name, user.badge_number, user.department,
        user.role, 1 if user.is_active else 0, user.avatar_url, user.provider,
        user.last_active_at, user.created_at, now
    ))
    conn.commit()
    conn.close()
    return user

def list_users() -> List[UserRecord]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM users
        WHERE id NOT LIKE 'test-%'
          AND email NOT LIKE '%test%'
          AND email NOT LIKE '%invalid%'
          AND email NOT LIKE '%candidate%'
          AND email NOT IN ('sarah.chen.cyber@gmail.com', 'marcus.cole.records@gmail.com', 'alex.rivera.forensics@gmail.com')
        ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, last_active_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [row_to_user(r) for r in rows]

def update_user_role(user_id: str, new_role: str) -> Optional[UserRecord]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat() + "Z"
    cursor.execute("""
        UPDATE users
        SET role = ?, updated_at = ?
        WHERE id = ?
    """, (new_role, now, user_id))
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)

def update_user_status(user_id: str, is_active: bool) -> Optional[UserRecord]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat() + "Z"
    cursor.execute("""
        UPDATE users
        SET is_active = ?, updated_at = ?
        WHERE id = ?
    """, (1 if is_active else 0, now, user_id))
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)

def touch_user_activity(user_id: str) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat() + "Z"
    cursor.execute("UPDATE users SET last_active_at = ?, updated_at = ? WHERE id = ?", (now, now, user_id))
    conn.commit()
    conn.close()

def delete_user(user_id: str) -> bool:
    """Permanently delete a user account from users table."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def seed_users_if_empty():
    """Seeds verified Google-authenticated accounts if users table is empty or needs update."""
    conn = get_db_connection()
    cursor = conn.cursor()
    # Remove any legacy demo accounts and test fixtures
    cursor.execute("""
        DELETE FROM users
        WHERE email IN (
            'admin@police.dept.gov', 'j.vance@police.dept.gov', 's.chen@police.dept.gov',
            'm.cole@police.dept.gov', 'a.rivera@police.dept.gov',
            'sarah.chen.cyber@gmail.com', 'marcus.cole.records@gmail.com', 'alex.rivera.forensics@gmail.com',
            'unauthorized.admin.candidate@gmail.com', 'invalid.role@gmail.com', 'test.officer.candidate@gmail.com',
            'temporary.candidate@gmail.com'
        )
        OR id IN ('admin-default-001', 'officer-vance-002', 'officer-chen-003', 'viewer-cole-004', 'viewer-rivera-005', 'goog-sarah-chen-002', 'goog-marcus-cole-003', 'goog-alex-rivera-004')
        OR id LIKE 'test-%'
        OR email LIKE '%test%'
        OR email LIKE '%invalid%'
        OR email LIKE '%candidate%'
    """)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    conn.close()

    if user_count == 0:
        now = datetime.utcnow().isoformat() + "Z"
        primary_admin = UserRecord(
            id="0b885f91-6a4a-4472-80da-2e26c3c89adc",
            email="arshrana2468@gmail.com",
            full_name="Arsh Rana",
            badge_number="GOOG-ARSH",
            department="Department Administrator",
            role="admin",
            is_active=True,
            avatar_url=None,
            provider="google",
            last_active_at=now,
            created_at="2026-10-01T08:00:00Z",
            updated_at=now
        )
        upsert_user(primary_admin)

def seed_demo_data_if_empty():
    seed_users_if_empty()
    seed_audit_ledger_if_needed()
    """Seeds realistic police forensic case history so the user sees immediate high-value data."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM cases")
    count = cursor.fetchone()[0]
    conn.close()
    
    if count > 0:
        return

    # Seed 3 realistic forensic cases
    demo_cases = [
        CaseRecord(
            id="f8e3c042-9b21-4f1e-873b-7a31b4912a01",
            case_number="CASE-2026-0982-A",
            officer_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            officer_name="Det. James Vance",
            officer_badge="DET-4812",
            department="Digital Forensics & Evidence Unit",
            media_type="image",
            file_name="suspect_alibi_timestamped.png",
            source_url=None,
            storage_path="evidence/f8e3c042-9b21-4f1e-873b-7a31b4912a01.png",
            file_size_bytes=3420811,
            sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            mime_type="image/png",
            verdict="likely_ai_generated",
            calibrated_confidence=88.4,
            confidence_interval_low=82.1,
            confidence_interval_high=93.6,
            per_detector_scores=PerDetectorScores(
                pixel_patterns=91.2,
                face_lighting=84.5,
                metadata_exif=79.0,
                motion_temporal=None,
                audio_spectral=None,
                breakdown=[
                    {"name": "High-Frequency Residuals", "category": "pixel_patterns", "score": 91.2, "weight": 0.35, "flagged": True, "status": "Synthetic Lattice Found", "detail": "Fourier spectral power analysis shows distinct 8-pixel periodicity characteristic of diffusion upscaler checkpoints."},
                    {"name": "Facial Illumination Vectors", "category": "face_lighting", "score": 84.5, "weight": 0.30, "flagged": True, "status": "Lighting Contradiction", "detail": "Left pupil specular reflection indicates directional key light at 42°, but background cast shadows indicate 180° diffuse overcast."},
                    {"name": "EXIF & Quantization Tables", "category": "metadata_exif", "score": 79.0, "weight": 0.35, "flagged": True, "status": "Stripped Provenance", "detail": "No hardware sensor PRNU profile detected. Chrominance quantization tables do not match known smartphone or DSLR firmware."}
                ]
            ),
            heatmap_url="/api/media/heatmap/f8e3c042-9b21-4f1e-873b-7a31b4912a01",
            media_url="/api/media/evidence/f8e3c042-9b21-4f1e-873b-7a31b4912a01",
            timeline_scores=[],
            text_snippet=None,
            model_name="DeepTrace-Ensemble-Core",
            model_version="v2.4-hybrid",
            known_error_rate_fpr=4.20,
            known_error_rate_fnr=6.80,
            limitations_notes="Diffusion residual fingerprints isolated across foreground boundary. Not certified for court submission without secondary physical evidence.",
            created_at="2026-10-20T14:32:10Z",
            updated_at="2026-10-20T14:32:10Z"
        ),
        CaseRecord(
            id="a2b4c6e8-1122-3344-5566-778899aabbcc",
            case_number="CASE-2026-0944-B",
            officer_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            officer_name="Det. James Vance",
            officer_badge="DET-4812",
            department="Digital Forensics & Evidence Unit",
            media_type="image",
            file_name="dashcam_capture_intersection_07.jpg",
            source_url=None,
            storage_path="evidence/a2b4c6e8-1122-3344-5566-778899aabbcc.jpg",
            file_size_bytes=1840220,
            sha256_hash="7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
            mime_type="image/jpeg",
            verdict="likely_authentic",
            calibrated_confidence=12.2,
            confidence_interval_low=6.5,
            confidence_interval_high=19.4,
            per_detector_scores=PerDetectorScores(
                pixel_patterns=14.0,
                face_lighting=8.5,
                metadata_exif=11.2,
                motion_temporal=None,
                audio_spectral=None,
                breakdown=[
                    {"name": "High-Frequency Residuals", "category": "pixel_patterns", "score": 14.0, "weight": 0.35, "flagged": False, "status": "Consistent Natural Noise", "detail": "Gaussian sensor noise distribution matches standard CMOS sensor response under 3200K halogen illumination."},
                    {"name": "Facial Illumination Vectors", "category": "face_lighting", "score": 8.5, "weight": 0.30, "flagged": False, "status": "Physically Coherent", "detail": "Shadow falloff on driver silhouette corresponds with streetlamp geometry."},
                    {"name": "EXIF & Quantization Tables", "category": "metadata_exif", "score": 11.2, "weight": 0.35, "flagged": False, "status": "Hardware Match", "detail": "JPEG quantization matrix matches Axon Fleet 3 camera firmware specification v4.12."}
                ]
            ),
            heatmap_url="/api/media/heatmap/a2b4c6e8-1122-3344-5566-778899aabbcc",
            media_url="/api/media/evidence/a2b4c6e8-1122-3344-5566-778899aabbcc",
            timeline_scores=[],
            text_snippet=None,
            model_name="DeepTrace-Ensemble-Core",
            model_version="v2.4-hybrid",
            known_error_rate_fpr=4.20,
            known_error_rate_fnr=6.80,
            limitations_notes="Natural camera sensor signature verified. Minor sensor dead pixels present in upper right quadrant consistent with device age.",
            created_at="2026-10-19T09:15:42Z",
            updated_at="2026-10-19T09:15:42Z"
        ),
        CaseRecord(
            id="c5d7e9f1-9988-7766-5544-33221100fedc",
            case_number="CASE-2026-0891-C",
            officer_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            officer_name="Det. James Vance",
            officer_badge="DET-4812",
            department="Digital Forensics & Evidence Unit",
            media_type="video",
            file_name="social_media_statement_clip.mp4",
            source_url="https://evidence-drop.local/clips/statement.mp4",
            storage_path="evidence/c5d7e9f1-9988-7766-5544-33221100fedc.mp4",
            file_size_bytes=14205930,
            sha256_hash="5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
            mime_type="video/mp4",
            verdict="inconclusive",
            calibrated_confidence=52.8,
            confidence_interval_low=41.0,
            confidence_interval_high=64.5,
            per_detector_scores=PerDetectorScores(
                pixel_patterns=44.1,
                face_lighting=58.3,
                metadata_exif=62.0,
                motion_temporal=51.0,
                audio_spectral=49.0,
                breakdown=[
                    {"name": "Temporal Blinking Cadence", "category": "motion_temporal", "score": 51.0, "weight": 0.25, "flagged": False, "status": "Inconclusive Cadence", "detail": "Subject exhibits irregular blink spacing, but video resolution (720x480) with 15fps variable frame rate inhibits precise neural tracking."},
                    {"name": "Facial Boundary Warping", "category": "face_lighting", "score": 58.3, "weight": 0.25, "flagged": True, "status": "Border Artifacts", "detail": "Jawline shows minor temporal flickering between frames 82-104, which may result from H.264 macroblock compression rather than deepfake generation."},
                    {"name": "Audio Spectral Continuity", "category": "audio_spectral", "score": 49.0, "weight": 0.25, "flagged": False, "status": "Severe Bandwidth Loss", "detail": "Audio stream has low-pass cutoff at 4.2 kHz due to social media voice compression. Vocoder phase cues destroyed."},
                    {"name": "Container Metadata", "category": "metadata_exif", "score": 62.0, "weight": 0.25, "flagged": True, "status": "Double Encoded", "detail": "Multiple moov atom rewrites detected. Original capture device unknown."}
                ]
            ),
            heatmap_url="/api/media/heatmap/c5d7e9f1-9988-7766-5544-33221100fedc",
            media_url="/api/media/evidence/c5d7e9f1-9988-7766-5544-33221100fedc",
            timeline_scores=[
                {"frame_number": 1, "timestamp_seconds": 0.0, "score": 38.0, "flagged": False, "anomaly_type": None},
                {"frame_number": 30, "timestamp_seconds": 1.0, "score": 41.5, "flagged": False, "anomaly_type": None},
                {"frame_number": 60, "timestamp_seconds": 2.0, "score": 49.0, "flagged": False, "anomaly_type": None},
                {"frame_number": 90, "timestamp_seconds": 3.0, "score": 68.2, "flagged": True, "anomaly_type": "Jaw boundary shear"},
                {"frame_number": 120, "timestamp_seconds": 4.0, "score": 64.0, "flagged": True, "anomaly_type": "Lip sync offset"},
                {"frame_number": 150, "timestamp_seconds": 5.0, "score": 46.0, "flagged": False, "anomaly_type": None},
                {"frame_number": 180, "timestamp_seconds": 6.0, "score": 42.0, "flagged": False, "anomaly_type": None}
            ],
            text_snippet=None,
            model_name="DeepTrace-Ensemble-Core",
            model_version="v2.4-hybrid",
            known_error_rate_fpr=4.20,
            known_error_rate_fnr=6.80,
            limitations_notes="Conflicting signals: Severe re-encoding compression masks synthetic markers while creating compression artifacts. Analysis cannot distinguish high-compression organic video from low-fidelity neural replacement.",
            created_at="2026-10-18T16:45:00Z",
            updated_at="2026-10-18T16:45:00Z"
        )
    ]
    
    for case in demo_cases:
        save_case(case)
        save_audit_log(AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id=case.id,
            case_number=case.case_number,
            user_id=case.officer_id,
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="EVIDENCE_UPLOADED",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Terminal/v2.4",
            details={"media_type": case.media_type, "file_name": case.file_name, "sha256": case.sha256_hash},
            created_at=case.created_at
        ))

    seed_audit_ledger_if_needed()

def seed_audit_ledger_if_needed():
    """Populates realistic timeline of law enforcement operations across all required categories."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Clean up automated test artifacts
    cursor.execute("DELETE FROM audit_logs WHERE ip_address = 'testclient' OR details LIKE '%test-google%'")
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM audit_logs WHERE action IN ('USER_SIGN_IN', 'EVIDENCE_UPLOADED', 'ANALYSIS_STARTED')")
    count = cursor.fetchone()[0]
    conn.close()

    if count >= 6:
        return

    realistic_events = [
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id=None,
            case_number=None,
            user_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="USER_SIGN_IN",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Station/v2.4",
            details={"method": "Google OAuth", "provider": "google", "department": "Digital Forensics & Evidence Unit"},
            created_at="2026-10-20T08:14:22Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="f8e3c042-9b21-4f1e-873b-7a31b4912a01",
            case_number="CASE-2026-0982-A",
            user_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="EVIDENCE_UPLOADED",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Station/v2.4",
            details={"file_name": "suspect_alibi_timestamped.png", "media_type": "image", "file_size_bytes": 3420811, "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "mime_type": "image/png"},
            created_at="2026-10-20T14:30:15Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="f8e3c042-9b21-4f1e-873b-7a31b4912a01",
            case_number="CASE-2026-0982-A",
            user_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="ANALYSIS_STARTED",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Station/v2.4",
            details={"pipeline": "Multi-Detector Ensemble", "media_type": "image", "modules": ["High-Frequency Residuals", "Facial Illumination", "EXIF Quantization"]},
            created_at="2026-10-20T14:30:45Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="f8e3c042-9b21-4f1e-873b-7a31b4912a01",
            case_number="CASE-2026-0982-A",
            user_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="CASE_CREATED",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Station/v2.4",
            details={"verdict": "likely_ai_generated", "calibrated_confidence": 88.4, "confidence_interval": [82.1, 93.6], "model_version": "v2.4-hybrid"},
            created_at="2026-10-20T14:32:10Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="f8e3c042-9b21-4f1e-873b-7a31b4912a01",
            case_number="CASE-2026-0982-A",
            user_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="CASE_VIEWED",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Station/v2.4",
            details={"inspected_section": "Thermal Anomaly Heatmap", "verdict": "likely_ai_generated"},
            created_at="2026-10-20T14:35:00Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="f8e3c042-9b21-4f1e-873b-7a31b4912a01",
            case_number="CASE-2026-0982-A",
            user_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="EVIDENCE_VIEWED",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Station/v2.4",
            details={"storage_path": "evidence/f8e3c042-9b21-4f1e-873b-7a31b4912a01.png", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},
            created_at="2026-10-20T14:36:20Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="f8e3c042-9b21-4f1e-873b-7a31b4912a01",
            case_number="CASE-2026-0982-A",
            user_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="REPORT_GENERATED",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Station/v2.4",
            details={"format": "PDF", "examiner": "Det. James Vance", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},
            created_at="2026-10-20T14:40:12Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="f8e3c042-9b21-4f1e-873b-7a31b4912a01",
            case_number="CASE-2026-0982-A",
            user_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="REPORT_DOWNLOADED",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Station/v2.4",
            details={"file_size_bytes": 352180, "format": "PDF", "case_number": "CASE-2026-0982-A"},
            created_at="2026-10-20T14:41:05Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id=None,
            case_number=None,
            user_id="goog-sarah-chen-002",
            user_email="sarah.chen.cyber@gmail.com",
            user_role="officer",
            action="USER_SIGN_IN",
            ip_address="192.168.1.115",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            details={"method": "Google OAuth", "department": "Forensics & Media Integrity"},
            created_at="2026-10-21T09:02:18Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="a2b4c6e8-1122-3344-5566-778899aabbcc",
            case_number="CASE-2026-0944-B",
            user_id="goog-sarah-chen-002",
            user_email="sarah.chen.cyber@gmail.com",
            user_role="officer",
            action="EVIDENCE_UPLOADED",
            ip_address="192.168.1.115",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            details={"file_name": "dashcam_capture_intersection_07.jpg", "media_type": "image", "file_size_bytes": 1840220, "sha256": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"},
            created_at="2026-10-21T09:14:02Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="a2b4c6e8-1122-3344-5566-778899aabbcc",
            case_number="CASE-2026-0944-B",
            user_id="goog-sarah-chen-002",
            user_email="sarah.chen.cyber@gmail.com",
            user_role="officer",
            action="ANALYSIS_STARTED",
            ip_address="192.168.1.115",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            details={"pipeline": "Optical Sensor Verification", "media_type": "image"},
            created_at="2026-10-21T09:14:30Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="a2b4c6e8-1122-3344-5566-778899aabbcc",
            case_number="CASE-2026-0944-B",
            user_id="goog-sarah-chen-002",
            user_email="sarah.chen.cyber@gmail.com",
            user_role="officer",
            action="CASE_CREATED",
            ip_address="192.168.1.115",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            details={"verdict": "likely_authentic", "calibrated_confidence": 12.2, "confidence_interval": [6.5, 19.4]},
            created_at="2026-10-21T09:15:42Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="a2b4c6e8-1122-3344-5566-778899aabbcc",
            case_number="CASE-2026-0944-B",
            user_id="goog-sarah-chen-002",
            user_email="sarah.chen.cyber@gmail.com",
            user_role="officer",
            action="EVIDENCE_DOWNLOADED",
            ip_address="192.168.1.115",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            details={"file_name": "dashcam_capture_intersection_07.jpg", "bytes": 1840220},
            created_at="2026-10-21T10:05:15Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id=None,
            case_number=None,
            user_id="0b885f91-6a4a-4472-80da-2e26c3c89adc",
            user_email="arshrana2468@gmail.com",
            user_role="admin",
            action="USER_SIGN_IN",
            ip_address="192.168.1.101",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            details={"method": "Google OAuth", "department": "Department Administrator"},
            created_at="2026-10-22T11:20:00Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id=None,
            case_number=None,
            user_id="0b885f91-6a4a-4472-80da-2e26c3c89adc",
            user_email="arshrana2468@gmail.com",
            user_role="admin",
            action="USER_ROLE_PROMOTED",
            ip_address="192.168.1.101",
            user_agent="DeepTrace-Admin",
            details={"target_user_email": "marcus.cole.records@gmail.com", "target_user_name": "Marcus Cole", "previous_role": "viewer", "new_role": "officer"},
            created_at="2026-10-22T11:25:34Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id=None,
            case_number=None,
            user_id="0b885f91-6a4a-4472-80da-2e26c3c89adc",
            user_email="arshrana2468@gmail.com",
            user_role="admin",
            action="USER_REACTIVATED",
            ip_address="192.168.1.101",
            user_agent="DeepTrace-Admin",
            details={"target_user_email": "alex.rivera.forensics@gmail.com", "target_user_name": "Alex Rivera", "new_active_status": True},
            created_at="2026-10-22T11:28:10Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="f8e3c042-9b21-4f1e-873b-7a31b4912a01",
            case_number="CASE-2026-0982-A",
            user_id="0b885f91-6a4a-4472-80da-2e26c3c89adc",
            user_email="arshrana2468@gmail.com",
            user_role="admin",
            action="CASE_UPDATED",
            ip_address="192.168.1.101",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            details={"updated_fields": ["limitations_notes"], "notes": "Secondary physical evidence verified by county lab."},
            created_at="2026-10-22T13:45:00Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="c5d7e9f1-9988-7766-5544-33221100fedc",
            case_number="CASE-2026-0891-C",
            user_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="EVIDENCE_UPLOADED",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Terminal/v2.4",
            details={"file_name": "social_media_statement_clip.mp4", "media_type": "video", "file_size_bytes": 14205930, "sha256": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"},
            created_at="2026-10-23T14:15:20Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="c5d7e9f1-9988-7766-5544-33221100fedc",
            case_number="CASE-2026-0891-C",
            user_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="ANALYSIS_STARTED",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Terminal/v2.4",
            details={"pipeline": "Temporal Blinking & Vocoder Spectrum", "media_type": "video"},
            created_at="2026-10-23T14:16:00Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id="c5d7e9f1-9988-7766-5544-33221100fedc",
            case_number="CASE-2026-0891-C",
            user_id="4a5e2c1b-7890-4123-8abc-9def01234567",
            user_email="j.vance@police.dept.gov",
            user_role="officer",
            action="CASE_CREATED",
            ip_address="192.168.1.104",
            user_agent="DeepTrace-Forensic-Terminal/v2.4",
            details={"verdict": "inconclusive", "calibrated_confidence": 52.8, "confidence_interval": [41.0, 64.5]},
            created_at="2026-10-23T14:18:30Z"
        ),
        AuditLogRecord(
            id=str(uuid.uuid4()),
            case_id=None,
            case_number=None,
            user_id="goog-sarah-chen-002",
            user_email="sarah.chen.cyber@gmail.com",
            user_role="officer",
            action="USER_SIGN_OUT",
            ip_address="192.168.1.115",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            details={"session_duration": "8h 28m", "reason": "Standard departure"},
            created_at="2026-10-23T17:30:10Z"
        )
    ]

    for log in realistic_events:
        save_audit_log(log)
