-- =============================================================================
-- DeepTrace Forensics / TruthLens AI - Supabase Production SQL Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kqllmwzftudlxswtnqtg/sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENSURE PROFILES TABLE & COLUMNS EXIST
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT 'Forensic Analyst',
    badge_number TEXT NOT NULL DEFAULT 'UNASSIGNED',
    department TEXT NOT NULL DEFAULT 'Forensic Investigation Unit',
    role TEXT NOT NULL DEFAULT 'officer',
    avatar_url TEXT,
    provider TEXT DEFAULT 'google',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Fix for existing tables: add columns if they were created before
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'google';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badge_number TEXT DEFAULT 'UNASSIGNED';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Forensic Investigation Unit';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'officer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- Drop old case-sensitive check constraint on role and replace with case-insensitive check
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (lower(role) IN ('officer', 'analyst', 'admin'));

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

    -- Ensure role is always lowercased to satisfy check constraint
    assigned_role := lower(trim(COALESCE(
        NEW.raw_app_meta_data->>'role',
        NEW.raw_user_meta_data->>'role',
        'officer'
    )));

    IF assigned_role NOT IN ('officer', 'analyst', 'admin') THEN
        assigned_role := 'officer';
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        badge_number,
        department,
        role,
        avatar_url,
        provider,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        assigned_badge,
        'Cyber Forensics & Evidence Unit',
        assigned_role,
        user_avatar,
        user_provider,
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        provider = COALESCE(EXCLUDED.provider, public.profiles.provider),
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
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND lower(role) = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role bypass on profiles" ON public.profiles;
CREATE POLICY "Service role bypass on profiles" ON public.profiles
    FOR ALL USING (true) WITH CHECK (true);
