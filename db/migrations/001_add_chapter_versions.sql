-- Chapter versions table for version control
CREATE TABLE IF NOT EXISTS chapter_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) DEFAULT 'system',
  change_description TEXT,
  UNIQUE(chapter_id, version_number)
);

-- Create index for version queries
CREATE INDEX IF NOT EXISTS chapter_versions_chapter_id_idx ON chapter_versions(chapter_id);
CREATE INDEX IF NOT EXISTS chapter_versions_created_at_idx ON chapter_versions(created_at DESC);
