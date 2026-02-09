-- ============================================================
-- QUANTUM OLYMPIAD — Database Migration
-- Creates the profiles table and a trigger that automatically
-- creates a profile row when a new user is confirmed via email.
-- ============================================================
-- 
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- Or via: supabase db push (if using Supabase CLI)
-- ============================================================

-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Student',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  level TEXT NOT NULL DEFAULT 'SMP' CHECK (level IN ('SMP', 'SMA')),
  current_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create the quiz_history table
CREATE TABLE IF NOT EXISTS public.quiz_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  question_signature TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_history_user_id ON public.quiz_history(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_history_user_subject ON public.quiz_history(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_quiz_history_signature ON public.quiz_history(question_signature);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for quiz_history
CREATE POLICY "Users can view their own history"
  ON public.quiz_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
  ON public.quiz_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all quiz history
CREATE POLICY "Admins can view all quiz history"
  ON public.quiz_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Enable Realtime for quiz_history (required for admin live feed)
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_history;

-- ============================================================
-- 6. THE CRITICAL TRIGGER: handle_new_user()
-- ============================================================
-- This function runs automatically after a new user is inserted
-- into auth.users (which happens after email confirmation).
-- It extracts the metadata sent during signUp() and creates
-- the corresponding profile row.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, level, current_streak)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'level', 'SMP'),
    0
  );
  RETURN NEW;
END;
$$;

-- 7. Create the trigger on auth.users
-- Drop first if it exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- DONE! The system will now:
-- 1. User calls supabase.auth.signUp() with metadata
-- 2. Supabase sends verification email
-- 3. User clicks link → row inserted into auth.users
-- 4. Trigger fires → profile created in public.profiles
-- 5. User can now sign in and their profile is ready
-- ============================================================
