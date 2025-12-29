-- Migration: Add user_role field and invite_codes table
-- This migration adds role-based access control and judge invitation system

-- Add user_role column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'user' CHECK (user_role IN ('user', 'judge'));

-- Add index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role
ON public.users(user_role);

-- Create invite_codes table for judge invitations
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'judge' CHECK (role IN ('judge')),
  created_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  used_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Add indexes for invite code queries
CREATE INDEX IF NOT EXISTS idx_invite_codes_code
ON public.invite_codes(code);

CREATE INDEX IF NOT EXISTS idx_invite_codes_email
ON public.invite_codes(email);

CREATE INDEX IF NOT EXISTS idx_invite_codes_is_active
ON public.invite_codes(is_active)
WHERE is_active = true;

-- Enable RLS on invite_codes table
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Invite codes policies
-- Public can read to validate codes
CREATE POLICY "Anyone can read active invite codes"
  ON public.invite_codes FOR SELECT
  USING (is_active = true);

-- Only authenticated users can create invite codes
CREATE POLICY "Only authenticated users can create invite codes"
  ON public.invite_codes FOR INSERT
  WITH CHECK (auth.uid() = created_by_id);

-- Update handle_new_user function to support user_role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
