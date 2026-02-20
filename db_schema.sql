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

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own guardians" ON public.guardians FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own guardians" ON public.guardians FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own guardians" ON public.guardians FOR DELETE USING (auth.uid() = user_id);
