-- Enable required extensions (included for completeness)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Novels table
CREATE TABLE IF NOT EXISTS novels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  chapter_count INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  outline TEXT,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  embedding vector(1536),
  UNIQUE(novel_id, number)
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
