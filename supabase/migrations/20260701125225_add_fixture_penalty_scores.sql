ALTER TABLE fixtures
  ADD COLUMN IF NOT EXISTS home_penalty_score INTEGER,
  ADD COLUMN IF NOT EXISTS away_penalty_score INTEGER;
