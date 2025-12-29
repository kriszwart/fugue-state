-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'wanderer' CHECK (subscription_tier IN ('wanderer', 'dreamer')),
  privacy_settings JSONB DEFAULT '{"dataRetention": "indefinite", "allowTraining": false, "sharePatterns": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  muse_type TEXT CHECK (muse_type IN ('analyst', 'poet', 'visualist', 'narrator', 'synthesis')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model_used TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data sources table
CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('gmail', 'drive', 'notion', 'mcp', 'local')),
  source_name TEXT NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memories table
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('text', 'image', 'audio', 'video', 'document')),
  extracted_data JSONB,
  emotional_tags TEXT[],
  themes TEXT[],
  temporal_marker TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory patterns table
CREATE TABLE IF NOT EXISTS public.memory_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('emotional', 'thematic', 'temporal', 'topical')),
  pattern_data JSONB NOT NULL,
  confidence_score NUMERIC(3, 2),
  memory_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artefacts table (generated images/videos)
CREATE TABLE IF NOT EXISTS public.artefacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES public.memories(id) ON DELETE SET NULL,
  artefact_type TEXT NOT NULL CHECK (artefact_type IN ('image', 'video', 'audio', 'text')),
  title TEXT,
  description TEXT,
  file_url TEXT,
  file_path TEXT,
  metadata JSONB,
  generation_model TEXT,
  generation_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_data_sources_user_id ON public.data_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON public.data_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON public.memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_data_source_id ON public.memories(data_source_id);
CREATE INDEX IF NOT EXISTS idx_memories_temporal_marker ON public.memories(temporal_marker);
CREATE INDEX IF NOT EXISTS idx_memories_emotional_tags ON public.memories USING GIN(emotional_tags);
CREATE INDEX IF NOT EXISTS idx_memories_themes ON public.memories USING GIN(themes);
CREATE INDEX IF NOT EXISTS idx_memory_patterns_user_id ON public.memory_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_artefacts_user_id ON public.artefacts(user_id);
CREATE INDEX IF NOT EXISTS idx_artefacts_memory_id ON public.artefacts(memory_id);
CREATE INDEX IF NOT EXISTS idx_artefacts_type ON public.artefacts(artefact_type);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artefacts ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Conversations policies
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Data sources policies
CREATE POLICY "Users can view own data sources"
  ON public.data_sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own data sources"
  ON public.data_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data sources"
  ON public.data_sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data sources"
  ON public.data_sources FOR DELETE
  USING (auth.uid() = user_id);

-- Memories policies
CREATE POLICY "Users can view own memories"
  ON public.memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memories"
  ON public.memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON public.memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON public.memories FOR DELETE
  USING (auth.uid() = user_id);

-- Memory patterns policies
CREATE POLICY "Users can view own memory patterns"
  ON public.memory_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memory patterns"
  ON public.memory_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory patterns"
  ON public.memory_patterns FOR DELETE
  USING (auth.uid() = user_id);

-- Artefacts policies
CREATE POLICY "Users can view own artefacts"
  ON public.artefacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own artefacts"
  ON public.artefacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own artefacts"
  ON public.artefacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own artefacts"
  ON public.artefacts FOR DELETE
  USING (auth.uid() = user_id);

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON public.data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

