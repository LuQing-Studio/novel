-- Enable required extensions (included for completeness)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (for auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (cookie-based sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- Novels table
CREATE TABLE IF NOT EXISTS novels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  idea TEXT NOT NULL DEFAULT '',
  description TEXT,
  genre VARCHAR(100),
  overall_outline TEXT NOT NULL DEFAULT '',
  overall_outline_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  chapter_count INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS novels_user_id_idx ON novels(user_id);

-- Volumes table (Fractal Outliner - Book -> Volume)
CREATE TABLE IF NOT EXISTS volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  outline TEXT NOT NULL DEFAULT '',
  target_chapters INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(novel_id, number)
);

CREATE INDEX IF NOT EXISTS volumes_novel_id_idx ON volumes(novel_id);

-- Chapter plans table (Fractal Outliner - Chapter-level outline)
CREATE TABLE IF NOT EXISTS chapter_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  volume_id UUID NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  outline TEXT NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'draft', -- draft | confirmed | drafted | done
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(novel_id, number)
);

CREATE INDEX IF NOT EXISTS chapter_plans_novel_id_idx ON chapter_plans(novel_id);
CREATE INDEX IF NOT EXISTS chapter_plans_volume_id_idx ON chapter_plans(volume_id);

-- Chapter plan versions (strict locking)
CREATE TABLE IF NOT EXISTS chapter_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_plan_id UUID NOT NULL REFERENCES chapter_plans(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  outline TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(32) DEFAULT 'user',
  change_description TEXT,
  UNIQUE(chapter_plan_id, version_number)
);

CREATE INDEX IF NOT EXISTS chapter_plan_versions_plan_id_idx ON chapter_plan_versions(chapter_plan_id);
CREATE INDEX IF NOT EXISTS chapter_plan_versions_created_at_idx ON chapter_plan_versions(created_at DESC);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  volume_id UUID REFERENCES volumes(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES chapter_plans(id) ON DELETE SET NULL,
  number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  outline TEXT,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  embedding vector(1536),
  UNIQUE(novel_id, number),
  UNIQUE(novel_id, plan_id)
);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  personality TEXT,
  abilities TEXT[],
  status VARCHAR(50) DEFAULT 'alive',
  first_appearance INTEGER,
  last_appearance INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  embedding vector(1536)
);

-- Foreshadowing table
CREATE TABLE IF NOT EXISTS foreshadowing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  planted_chapter INTEGER NOT NULL,
  planned_reveal_chapter INTEGER,
  revealed BOOLEAN DEFAULT FALSE,
  revealed_chapter INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  embedding vector(1536)
);

-- World settings table
CREATE TABLE IF NOT EXISTS world_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  related_chapters INTEGER[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  embedding vector(1536)
);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS chapters_embedding_idx ON chapters USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS characters_embedding_idx ON characters USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS foreshadowing_embedding_idx ON foreshadowing USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS world_settings_embedding_idx ON world_settings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS chapters_novel_id_idx ON chapters(novel_id);
CREATE INDEX IF NOT EXISTS characters_novel_id_idx ON characters(novel_id);
CREATE INDEX IF NOT EXISTS foreshadowing_novel_id_idx ON foreshadowing(novel_id);
CREATE INDEX IF NOT EXISTS world_settings_novel_id_idx ON world_settings(novel_id);

-- Chapter annotations (Reviewer Loop)
CREATE TABLE IF NOT EXISTS chapter_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'open', -- open | applied | dismissed
  quote TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS chapter_annotations_chapter_id_idx ON chapter_annotations(chapter_id);
CREATE INDEX IF NOT EXISTS chapter_annotations_status_idx ON chapter_annotations(status);

-- Techniques (global per user)
CREATE TABLE IF NOT EXISTS techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  content TEXT NOT NULL,
  sync_status VARCHAR(16) NOT NULL DEFAULT 'pending', -- pending | synced | failed
  last_synced_at TIMESTAMP,
  lightrag_doc_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS techniques_user_id_idx ON techniques(user_id);
CREATE INDEX IF NOT EXISTS techniques_tags_gin_idx ON techniques USING gin(tags);

CREATE TABLE IF NOT EXISTS technique_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id UUID NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(32) DEFAULT 'user',
  change_description TEXT,
  UNIQUE(technique_id, version_number)
);

CREATE INDEX IF NOT EXISTS technique_versions_technique_id_idx ON technique_versions(technique_id);
CREATE INDEX IF NOT EXISTS technique_versions_created_at_idx ON technique_versions(created_at DESC);
