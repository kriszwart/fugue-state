-- Migration: Add initialization tracking to users table
-- This migration adds fields to track user initialization state

-- Add initialization_completed_at timestamp
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS initialization_completed_at TIMESTAMPTZ;

-- Add muse_type to users table (default muse for conversations)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS muse_type TEXT CHECK (muse_type IN ('analyst', 'poet', 'visualist', 'narrator', 'synthesis'));

-- Add index for initialization status queries
CREATE INDEX IF NOT EXISTS idx_users_initialization_status 
ON public.users(initialization_completed_at) 
WHERE initialization_completed_at IS NULL;

-- Add index for muse_type queries
CREATE INDEX IF NOT EXISTS idx_users_muse_type 
ON public.users(muse_type);
























