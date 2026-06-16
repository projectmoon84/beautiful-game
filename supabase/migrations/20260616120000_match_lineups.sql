-- ============================================================
-- Migration: match_lineups
-- Confirmed and predicted starting XIs + bench, per team per fixture.
-- Sub columns stamped by sync-espn after processing substitution events.
-- ============================================================

CREATE TABLE IF NOT EXISTS match_lineups (
  fixture_id            TEXT NOT NULL,
  team_id               TEXT NOT NULL,
  player_id             TEXT NOT NULL,
  player_name           TEXT NOT NULL,
  shirt_number          INTEGER NOT NULL DEFAULT 99,
  position              TEXT NOT NULL CHECK (position IN ('GK','DEF','MID','FWD')),
  is_starter            BOOLEAN NOT NULL DEFAULT TRUE,
  formation             TEXT,
  -- Substitution data (null if player not involved in a sub)
  subbed_off_minute     INTEGER,
  subbed_on_minute      INTEGER,
  subbed_for_player_id  TEXT,
  -- Provenance
  source                TEXT,
  edited_by_admin       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (fixture_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_match_lineups_fixture ON match_lineups (fixture_id);
CREATE INDEX IF NOT EXISTS idx_match_lineups_fixture_team ON match_lineups (fixture_id, team_id);
