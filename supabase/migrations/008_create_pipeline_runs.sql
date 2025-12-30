-- Create pipeline_runs table for operation history
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES public.memories(id) ON DELETE SET NULL,
  overall_status TEXT NOT NULL CHECK (overall_status IN ('success', 'partial', 'failed', 'running')),
  total_duration INTEGER, -- Duration in milliseconds
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  steps JSONB NOT NULL, -- Array of PipelineStepResult
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_user_id ON public.pipeline_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_memory_id ON public.pipeline_runs(memory_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started_at ON public.pipeline_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON public.pipeline_runs(overall_status);

-- RLS policies
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pipeline runs"
  ON public.pipeline_runs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pipeline runs"
  ON public.pipeline_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pipeline runs"
  ON public.pipeline_runs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pipeline runs"
  ON public.pipeline_runs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);











