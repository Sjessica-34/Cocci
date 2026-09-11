-- Detailed carbon inputs. Additive and idempotent.
-- Do not run this migration on Neon preproduction automatically.

BEGIN;

CREATE TABLE IF NOT EXISTS carbon_bilan_travel_items (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  carbon_bilan_id INTEGER NOT NULL REFERENCES carbon_bilans(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  label TEXT NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'km',
  emission_factor NUMERIC(14, 9),
  emissions NUMERIC(14, 3),
  scope TEXT NOT NULL DEFAULT '3',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carbon_travel_items_emissions_nonnegative CHECK (emissions IS NULL OR emissions >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS carbon_travel_items_bilan_category_idx
  ON carbon_bilan_travel_items (carbon_bilan_id, category_key);
CREATE INDEX IF NOT EXISTS carbon_travel_items_org_exercise_idx
  ON carbon_bilan_travel_items (organization_id, exercise_id);

CREATE TABLE IF NOT EXISTS carbon_bilan_usage_items (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  carbon_bilan_id INTEGER NOT NULL REFERENCES carbon_bilans(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  units_sold INTEGER NOT NULL CHECK (units_sold >= 0),
  lifespan_years NUMERIC(8, 2) NOT NULL CHECK (lifespan_years >= 0),
  consumes_energy BOOLEAN NOT NULL DEFAULT TRUE,
  energy_type TEXT,
  consumption_per_year NUMERIC(14, 3),
  unit TEXT,
  country TEXT,
  emission_factor NUMERIC(14, 9),
  emissions NUMERIC(14, 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carbon_usage_items_emissions_nonnegative CHECK (emissions IS NULL OR emissions >= 0)
);

CREATE INDEX IF NOT EXISTS carbon_usage_items_bilan_idx
  ON carbon_bilan_usage_items (carbon_bilan_id);
CREATE INDEX IF NOT EXISTS carbon_usage_items_org_exercise_idx
  ON carbon_bilan_usage_items (organization_id, exercise_id);

COMMIT;