-- ============================================================
-- Migration 003: Textures + News tables + Admin write policies
-- ============================================================

-- Textures table (background SVG patterns for team kit cards)
CREATE TABLE IF NOT EXISTS textures (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  file_path TEXT NOT NULL,
  enabled   BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE textures ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read ON textures
  FOR SELECT USING (enabled = true);

-- News items
CREATE TABLE IF NOT EXISTS news (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline     TEXT NOT NULL,
  url          TEXT,
  team_id      TEXT REFERENCES teams(id),
  fixture_id   UUID REFERENCES fixtures(id),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read ON news
  FOR SELECT USING (true);

-- ── Seed textures ────────────────────────────────────────────
INSERT INTO textures (id, name, file_path, enabled) VALUES
  ('stripes', 'Stripes', '/textures/stripes.svg', true),
  ('dots',    'Dots',    '/textures/dots.svg',    true),
  ('weave',   'Weave',   '/textures/weave.svg',   true)
ON CONFLICT (id) DO NOTHING;

-- ── Admin write policies (all tables) ────────────────────────
-- Authenticated users (admin) can INSERT / UPDATE / DELETE

CREATE POLICY admin_write ON teams
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY admin_write ON groups
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY admin_write ON venues
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY admin_write ON players
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY admin_write ON fixtures
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY admin_write ON match_events
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY admin_write ON insights
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY admin_write ON textures
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY admin_write ON news
  FOR ALL USING (auth.uid() IS NOT NULL);
