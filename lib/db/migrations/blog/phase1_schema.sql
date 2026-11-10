BEGIN;

CREATE TABLE IF NOT EXISTS blog_posts (
  id serial PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('rse_advice', 'cocci_news')),
  cover_image_url text,
  cover_image_alt text NOT NULL DEFAULT '',
  keywords text[] NOT NULL DEFAULT '{}',
  language text NOT NULL DEFAULT 'fr',
  seo_title text,
  meta_description text,
  structured_data jsonb,
  canonical_url text,
  source text NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'visia')),
  source_updated_at timestamptz,
  manually_edited boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_unique
  ON blog_posts (slug);

CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx
  ON blog_posts (published_at DESC)
  WHERE is_published = true;

CREATE TABLE IF NOT EXISTS blog_sync_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  visia_sync_enabled boolean NOT NULL DEFAULT false,
  last_sync_at timestamptz,
  last_sync_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO blog_sync_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMIT;
