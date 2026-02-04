-- InkFlow v2 schema migration (Fractal Outliner + Workbench + Techniques + Annotations)

-- 1) novels: idea + overall_outline
ALTER TABLE novels
  ADD COLUMN IF NOT EXISTS idea TEXT NOT NULL DEFAULT '';

ALTER TABLE novels
  ADD COLUMN IF NOT EXISTS overall_outline TEXT NOT NULL DEFAULT '';

ALTER TABLE novels
  ADD COLUMN IF NOT EXISTS overall_outline_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) volumes
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

-- 3) chapter_plans + versions
CREATE TABLE IF NOT EXISTS chapter_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  volume_id UUID NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  outline TEXT NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(novel_id, number)
);

CREATE INDEX IF NOT EXISTS chapter_plans_novel_id_idx ON chapter_plans(novel_id);
CREATE INDEX IF NOT EXISTS chapter_plans_volume_id_idx ON chapter_plans(volume_id);

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

-- 4) chapters: bind to volumes + plans
ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS volume_id UUID;

ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS plan_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chapters_volume_id_fkey'
  ) THEN
    ALTER TABLE chapters
      ADD CONSTRAINT chapters_volume_id_fkey
      FOREIGN KEY (volume_id) REFERENCES volumes(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chapters_plan_id_fkey'
  ) THEN
    ALTER TABLE chapters
      ADD CONSTRAINT chapters_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES chapter_plans(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS chapters_novel_id_plan_id_uq ON chapters(novel_id, plan_id);

-- 5) reviewer loop: annotations
CREATE TABLE IF NOT EXISTS chapter_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  quote TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS chapter_annotations_chapter_id_idx ON chapter_annotations(chapter_id);
CREATE INDEX IF NOT EXISTS chapter_annotations_status_idx ON chapter_annotations(status);

-- 6) techniques: global per user
CREATE TABLE IF NOT EXISTS techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  content TEXT NOT NULL,
  sync_status VARCHAR(16) NOT NULL DEFAULT 'pending',
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

-- 7) Backfill v1 data into v2 structures
-- 7.1) Ensure each novel has at least Volume 1
INSERT INTO volumes (novel_id, number, title, outline)
SELECT n.id, 1, '卷一', ''
FROM novels n
WHERE NOT EXISTS (
  SELECT 1 FROM volumes v WHERE v.novel_id = n.id AND v.number = 1
);

-- 7.2) Create chapter_plans for existing chapters (mapped to Volume 1)
INSERT INTO chapter_plans (novel_id, volume_id, number, title, outline, status)
SELECT
  c.novel_id,
  v.id AS volume_id,
  c.number,
  c.title,
  COALESCE(c.outline, '') AS outline,
  'drafted' AS status
FROM chapters c
JOIN volumes v ON v.novel_id = c.novel_id AND v.number = 1
WHERE NOT EXISTS (
  SELECT 1 FROM chapter_plans p WHERE p.novel_id = c.novel_id AND p.number = c.number
);

-- 7.3) Backfill chapters.volume_id + chapters.plan_id
UPDATE chapters c
SET
  volume_id = v.id,
  plan_id = p.id
FROM volumes v
JOIN chapter_plans p ON p.novel_id = v.novel_id AND p.number = c.number
WHERE
  c.novel_id = v.novel_id
  AND v.number = 1
  AND (c.volume_id IS NULL OR c.plan_id IS NULL);

