-- Create creative_analyses table for storing comprehensive creative writing analysis
-- Migration: 011_create_creative_analyses.sql

-- Create the creative_analyses table
CREATE TABLE IF NOT EXISTS creative_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  character_analysis JSONB,
  cia_profile JSONB,
  poem_inspirations JSONB[],
  thematic_patterns JSONB,
  writing_style JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, memory_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_creative_analyses_user_id ON creative_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_analyses_memory_id ON creative_analyses(memory_id);
CREATE INDEX IF NOT EXISTS idx_creative_analyses_created_at ON creative_analyses(created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_creative_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creative_analyses_updated_at_trigger
  BEFORE UPDATE ON creative_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_creative_analyses_updated_at();

-- Enable Row Level Security
ALTER TABLE creative_analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only read their own analyses
CREATE POLICY "Users can view their own creative analyses"
  ON creative_analyses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own analyses
CREATE POLICY "Users can create their own creative analyses"
  ON creative_analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own analyses
CREATE POLICY "Users can update their own creative analyses"
  ON creative_analyses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own analyses
CREATE POLICY "Users can delete their own creative analyses"
  ON creative_analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE creative_analyses IS 'Stores comprehensive analysis of creative writing collections including character profiles, CIA-style analysis, poem inspirations, themes, and writing style';
COMMENT ON COLUMN creative_analyses.character_analysis IS 'Character analysis including starseed profile, personality archetypes, character traits';
COMMENT ON COLUMN creative_analyses.cia_profile IS 'CIA-style psychological profile with behavioral patterns and risk assessment';
COMMENT ON COLUMN creative_analyses.poem_inspirations IS 'Array of poem inspiration prompts based on themes and emotional triggers';
COMMENT ON COLUMN creative_analyses.thematic_patterns IS 'Recurring motifs, narrative threads, and symbolic elements';
COMMENT ON COLUMN creative_analyses.writing_style IS 'Analysis of voice, tone, rhythm, and literary devices';










