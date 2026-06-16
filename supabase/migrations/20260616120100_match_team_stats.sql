-- ============================================================
-- Migration: match_team_stats
-- Per-team in-match statistics from ESPN boxscore.
-- Possession and counting stats (shots, cards, corners, etc.).
-- ============================================================

CREATE TABLE IF NOT EXISTS match_team_stats (
  fixture_id      TEXT NOT NULL,
  team_id         TEXT NOT NULL,
  possession_pct  NUMERIC,
  shots_on_target INTEGER,
  shots_off_target INTEGER,
  shots_blocked   INTEGER,
  corners         INTEGER,
  offsides        INTEGER,
  fouls           INTEGER,
  yellow_cards    INTEGER,
  red_cards       INTEGER,
  -- Provenance
  source          TEXT,
  edited_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (fixture_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_match_team_stats_fixture ON match_team_stats (fixture_id);
