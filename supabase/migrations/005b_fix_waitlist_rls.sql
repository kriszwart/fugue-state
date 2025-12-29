-- Fix RLS policies for anonymous waitlist signups
-- Run this if anonymous users can't join the waitlist

-- Drop existing policy and recreate
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

-- Allow anyone (anon + authenticated) to insert
CREATE POLICY "Enable insert for anon and authenticated"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to read (for checking status)
DROP POLICY IF EXISTS "Anyone can read waitlist" ON public.waitlist;
CREATE POLICY "Enable read for all users"
  ON public.waitlist
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Ensure anon role has the right permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT ON public.waitlist TO anon;
GRANT SELECT, INSERT ON public.waitlist TO authenticated;

-- Verify permissions
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated successfully!';
  RAISE NOTICE 'Anonymous users can now join the waitlist.';
END $$;
