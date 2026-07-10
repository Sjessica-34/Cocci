-- Baromètre Social module — initial schema.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS barometre_campaigns (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'anonymous',
  status TEXT NOT NULL DEFAULT 'draft',
  open_date DATE NOT NULL,
  close_date DATE NOT NULL,
  nb_collaborateurs INTEGER NOT NULL DEFAULT 0,
  public_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE barometre_campaigns ADD CONSTRAINT barometre_campaigns_token_unique UNIQUE (public_token);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS barometre_custom_questions (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES barometre_campaigns(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS barometre_responses (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES barometre_campaigns(id) ON DELETE CASCADE,
  respondent_label TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS barometre_answers (
  id SERIAL PRIMARY KEY,
  response_id INTEGER NOT NULL REFERENCES barometre_responses(id) ON DELETE CASCADE,
  question_code TEXT NOT NULL,
  scale_value INTEGER,
  free_text TEXT
);

DO $$ BEGIN
  ALTER TABLE barometre_answers ADD CONSTRAINT barometre_answers_response_question_unique UNIQUE (response_id, question_code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS barometre_actions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id INTEGER NOT NULL REFERENCES barometre_campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_theme TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS barometre_ai_summaries (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES barometre_campaigns(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  themes JSONB NOT NULL DEFAULT '[]',
  suggestions JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE barometre_ai_summaries ADD CONSTRAINT barometre_ai_summaries_campaign_unique UNIQUE (campaign_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
