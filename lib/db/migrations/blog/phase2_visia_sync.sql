BEGIN;

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS cover_image_alt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS structured_data jsonb,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS source_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS manually_edited boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS blog_sync_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  visia_sync_enabled boolean NOT NULL DEFAULT false,
  last_sync_at timestamptz,
  last_sync_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO blog_sync_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

COMMIT;
