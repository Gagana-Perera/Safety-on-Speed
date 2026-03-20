-- Run this SQL in your Supabase Dashboard SQL Editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    first_name TEXT,
    surname TEXT,
    phone_number TEXT,
    nic_number TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guardians table
CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the profile preference used by the app's Privacy screen
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS live_location BOOLEAN DEFAULT TRUE;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_notif BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS push_notif BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS alert_notif BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS personal_data_access BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS camera_access BOOLEAN DEFAULT TRUE;

ALTER TABLE public.guardians
    ADD COLUMN IF NOT EXISTS g1_name TEXT,
    ADD COLUMN IF NOT EXISTS g1_phone TEXT,
    ADD COLUMN IF NOT EXISTS g1_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS g2_name TEXT,
    ADD COLUMN IF NOT EXISTS g2_phone TEXT,
    ADD COLUMN IF NOT EXISTS g2_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS g3_name TEXT,
    ADD COLUMN IF NOT EXISTS g3_phone TEXT,
    ADD COLUMN IF NOT EXISTS g3_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS g4_name TEXT,
    ADD COLUMN IF NOT EXISTS g4_phone TEXT,
    ADD COLUMN IF NOT EXISTS g4_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS g5_name TEXT,
    ADD COLUMN IF NOT EXISTS g5_phone TEXT,
    ADD COLUMN IF NOT EXISTS g5_verified BOOLEAN DEFAULT FALSE;

-- Create live locations table used for SOS sharing
CREATE TABLE IF NOT EXISTS public.live_locations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.sos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('quick', 'emergency')),
    share_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    user_name TEXT,
    guardian_count INTEGER NOT NULL DEFAULT 0,
    alert_delivery_method TEXT,
    alert_delivery_status TEXT,
    first_lat DOUBLE PRECISION,
    first_lng DOUBLE PRECISION,
    last_lat DOUBLE PRECISION,
    last_lng DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS sos_sessions_one_active_per_user
    ON public.sos_sessions (user_id)
    WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.sos_locations (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.sos_sessions(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_locations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own guardians" ON public.guardians FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own guardians" ON public.guardians FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own guardians" ON public.guardians FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own live location" ON public.live_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own live location" ON public.live_locations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own live location" ON public.live_locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active live locations" ON public.live_locations FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Users can insert their own sos sessions" ON public.sos_sessions;
DROP POLICY IF EXISTS "Users can update their own sos sessions" ON public.sos_sessions;
DROP POLICY IF EXISTS "Users can view their own sos sessions" ON public.sos_sessions;
DROP POLICY IF EXISTS "Anyone can view active sos sessions" ON public.sos_sessions;
DROP POLICY IF EXISTS "Users can insert their own sos locations" ON public.sos_locations;
DROP POLICY IF EXISTS "Users can view their own sos locations" ON public.sos_locations;

CREATE POLICY "Users can insert their own sos sessions" ON public.sos_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sos sessions" ON public.sos_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own sos sessions" ON public.sos_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active sos sessions" ON public.sos_sessions FOR SELECT USING (status = 'active');

CREATE POLICY "Users can insert their own sos locations" ON public.sos_locations FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.sos_sessions
        WHERE public.sos_sessions.id = session_id
          AND public.sos_sessions.user_id = auth.uid()
    )
);

CREATE POLICY "Users can view their own sos locations" ON public.sos_locations FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.sos_sessions
        WHERE public.sos_sessions.id = session_id
          AND public.sos_sessions.user_id = auth.uid()
    )
);
