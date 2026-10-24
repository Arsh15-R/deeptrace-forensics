-- =============================================================================
-- DeepTrace Forensics / TruthLens AI - Supabase Production SQL Migration & Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kqllmwzftudlxswtnqtg/sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. PUBLIC.PROFILES TABLE & USER MANAGEMENT
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT 'Forensic Analyst',
    badge_number TEXT NOT NULL DEFAULT 'UNASSIGNED',
    department TEXT NOT NULL DEFAULT 'Forensic Investigation Unit',
    role TEXT NOT NULL DEFAULT 'officer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_active_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    avatar_url TEXT,
    provider TEXT DEFAULT 'google',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all necessary columns exist on existing deployments
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'google';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badge_number TEXT DEFAULT 'UNASSIGNED';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Forensic Investigation Unit';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'officer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- Update role check constraint to support officer, analyst, viewer, and admin
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (lower(role) IN ('officer', 'analyst', 'viewer', 'admin'));

-- Indexes for fast profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =============================================================================
-- 2. AUTOMATIC USER PROVISIONING TRIGGER (Google OAuth -> public.profiles)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_avatar TEXT;
    user_provider TEXT;
    assigned_badge TEXT;
    assigned_role TEXT;
BEGIN
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    user_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );
    user_provider := COALESCE(
        NEW.raw_app_meta_data->>'provider',
        'google'
    );
    assigned_badge := COALESCE(
        NEW.raw_user_meta_data->>'badge_number',
        'GOOG-' || upper(substr(NEW.id::text, 1, 4))
    );

    -- Enforce initial role assignment
    assigned_role := lower(trim(COALESCE(
        NEW.raw_app_meta_data->>'role',
        NEW.raw_user_meta_data->>'role',
        CASE 
            WHEN lower(NEW.email) = 'arshrana2468@gmail.com' THEN 'admin'
            WHEN lower(NEW.email) LIKE 'admin@%' THEN 'admin'
            ELSE 'officer'
        END
    )));

    IF assigned_role NOT IN ('officer', 'analyst', 'viewer', 'admin') THEN
        assigned_role := 'officer';
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        badge_number,
        department,
        role,
        is_active,
        avatar_url,
        provider,
        last_active_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        assigned_badge,
        'Cyber Forensics & Evidence Unit',
        assigned_role,
        true,
        user_avatar,
        user_provider,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = CASE 
            WHEN public.profiles.role = 'admin' THEN 'admin'
            ELSE EXCLUDED.role 
        END,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        provider = COALESCE(EXCLUDED.provider, public.profiles.provider),
        last_active_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 3. PUBLIC.CASES TABLE (FORENSIC DOSSIERS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cases (
    id TEXT PRIMARY KEY,
    case_number TEXT NOT NULL,
    officer_id TEXT NOT NULL,
    officer_name TEXT NOT NULL DEFAULT 'Det. Arsh Rana',
    officer_badge TEXT NOT NULL DEFAULT 'GOOG-ARSH',
    department TEXT NOT NULL DEFAULT 'Cyber Forensics & Evidence Unit',
    media_type TEXT NOT NULL,
    file_name TEXT,
    source_url TEXT,
    storage_path TEXT,
    file_size_bytes BIGINT,
    sha256_hash TEXT NOT NULL,
    mime_type TEXT,
    verdict TEXT NOT NULL,
    calibrated_confidence REAL NOT NULL,
    confidence_interval_low REAL NOT NULL,
    confidence_interval_high REAL NOT NULL,
    per_detector_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    heatmap_storage_path TEXT,
    timeline_scores JSONB DEFAULT '[]'::jsonb,
    text_snippet TEXT,
    model_name TEXT NOT NULL DEFAULT 'TruthLens Multi-Modal Ensemble',
    model_version TEXT NOT NULL DEFAULT 'v4.3-calibrated',
    known_error_rate_fpr REAL NOT NULL DEFAULT 3.2,
    known_error_rate_fnr REAL NOT NULL DEFAULT 4.8,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes for Case History filtering and sorting
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON public.cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_verdict ON public.cases(verdict);
CREATE INDEX IF NOT EXISTS idx_cases_media_type ON public.cases(media_type);
CREATE INDEX IF NOT EXISTS idx_cases_sha256 ON public.cases(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_cases_officer_id ON public.cases(officer_id);

-- =============================================================================
-- 4. PUBLIC.AUDIT_LOGS TABLE (CHAIN OF CUSTODY LEDGER)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    case_id TEXT,
    case_number TEXT,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'officer',
    action TEXT NOT NULL,
    ip_address TEXT DEFAULT '127.0.0.1',
    user_agent TEXT DEFAULT 'DeepTrace-NextApp/v4.3',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes for Audit Ledger
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON public.audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND lower(role) = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read profiles" ON public.profiles;
CREATE POLICY "Users can read profiles" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Service role full access on profiles" ON public.profiles;
CREATE POLICY "Service role full access on profiles" ON public.profiles
    FOR ALL USING (true) WITH CHECK (true);

-- Cases Policies
DROP POLICY IF EXISTS "Allow select cases" ON public.cases;
CREATE POLICY "Allow select cases" ON public.cases
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert cases" ON public.cases;
CREATE POLICY "Allow insert cases" ON public.cases
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update cases" ON public.cases;
CREATE POLICY "Allow update cases" ON public.cases
    FOR UPDATE USING (true);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Allow select audit_logs" ON public.audit_logs;
CREATE POLICY "Allow select audit_logs" ON public.audit_logs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert audit_logs" ON public.audit_logs;
CREATE POLICY "Allow insert audit_logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- 6. REALTIME REPLICATION (For Live Panel Updation)
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cases'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'audit_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END $$;

-- =============================================================================
-- 7. EVIDENCE STORAGE BUCKET & POLICIES (evidence-vault)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'evidence-vault',
    'evidence-vault',
    true,
    104857600, -- 100 MB limit
    ARRAY[
        'image/jpeg', 'image/png', 'image/webp',
        'audio/wav', 'audio/mpeg', 'audio/ogg',
        'video/mp4', 'video/quicktime', 'video/webm',
        'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY[
        'image/jpeg', 'image/png', 'image/webp',
        'audio/wav', 'audio/mpeg', 'audio/ogg',
        'video/mp4', 'video/quicktime', 'video/webm',
        'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];

-- Allow public read access to evidence vault assets & heatmaps
DROP POLICY IF EXISTS "Public Read Evidence Vault" ON storage.objects;
CREATE POLICY "Public Read Evidence Vault" ON storage.objects
    FOR SELECT USING (bucket_id = 'evidence-vault');

-- Allow authenticated and service uploads to evidence vault
DROP POLICY IF EXISTS "Allow Upload Evidence Vault" ON storage.objects;
CREATE POLICY "Allow Upload Evidence Vault" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'evidence-vault');

DROP POLICY IF EXISTS "Allow Update Evidence Vault" ON storage.objects;
CREATE POLICY "Allow Update Evidence Vault" ON storage.objects
    FOR UPDATE USING (bucket_id = 'evidence-vault');

-- =============================================================================
-- 8. PYTHON ML BACKEND COMPATIBILITY TABLES (Optional dual-sync)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.forensic_analyses (
    analysis_id TEXT PRIMARY KEY,
    user_id TEXT,
    media_type TEXT NOT NULL,
    original_filename TEXT,
    original_file_hash TEXT,
    file_size_bytes BIGINT,
    mime_type TEXT,
    assessment TEXT,
    assessment_label TEXT,
    suspicion_score INT,
    model_confidence INT,
    model_name TEXT,
    model_version TEXT,
    certificate_id TEXT,
    processing_duration_ms INT,
    payload_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.custody_events (
    event_id TEXT PRIMARY KEY,
    analysis_id TEXT,
    user_id TEXT,
    actor_name TEXT,
    event_type TEXT NOT NULL,
    file_hash TEXT,
    storage_reference TEXT,
    notes TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.forensic_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custody_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select forensic_analyses" ON public.forensic_analyses;
CREATE POLICY "Allow select forensic_analyses" ON public.forensic_analyses
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert forensic_analyses" ON public.forensic_analyses;
CREATE POLICY "Allow insert forensic_analyses" ON public.forensic_analyses
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select custody_events" ON public.custody_events;
CREATE POLICY "Allow select custody_events" ON public.custody_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert custody_events" ON public.custody_events;
CREATE POLICY "Allow insert custody_events" ON public.custody_events
    FOR INSERT WITH CHECK (true);

