-- Migration: Add preferences column to users table
-- This allows users to store their UI preferences, timeout settings, and notification preferences

-- Add preferences column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Add comment to document the preferences structure
COMMENT ON COLUMN public.users.preferences IS 'User preferences including autoVoice, defaultMuse, timeoutSettings, and notifications';










