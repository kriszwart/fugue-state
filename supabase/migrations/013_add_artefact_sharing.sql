-- Add sharing fields to artefacts table
ALTER TABLE public.artefacts
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- Create index for share token lookups
CREATE INDEX IF NOT EXISTS idx_artefacts_share_token ON public.artefacts(share_token) WHERE share_token IS NOT NULL;

-- Create index for public artefacts
CREATE INDEX IF NOT EXISTS idx_artefacts_is_public ON public.artefacts(is_public) WHERE is_public = true;

-- Add policy to allow public access to shared artefacts
CREATE POLICY "Public can view shared artefacts"
  ON public.artefacts FOR SELECT
  USING (is_public = true);

-- Function to generate unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  token TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    token := token || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
  END LOOP;
  RETURN token;
END;
$$ LANGUAGE plpgsql;
