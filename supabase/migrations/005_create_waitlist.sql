-- Waitlist table for managing access requests
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  reason TEXT, -- Why they want access
  referral_code TEXT, -- Optional: how they found you
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);

-- RLS policies
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (join waitlist)
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users can read their own waitlist entry
CREATE POLICY "Users can read own waitlist entry"
ON public.waitlist FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE auth.uid() = id));

-- Only service role can update (approve/reject)
-- This will be done via API endpoint with proper auth

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_waitlist_updated_at ON public.waitlist;
CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT ON public.waitlist TO anon;
GRANT ALL ON public.waitlist TO authenticated;

-- Create a view for admins to see waitlist stats
CREATE OR REPLACE VIEW public.waitlist_stats AS
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_request,
  MAX(created_at) as newest_request
FROM public.waitlist
GROUP BY status;

GRANT SELECT ON public.waitlist_stats TO authenticated;
