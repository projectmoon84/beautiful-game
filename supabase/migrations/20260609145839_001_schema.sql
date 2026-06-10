-- groups (no deps)
CREATE TABLE groups (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

-- venues (no deps)
CREATE TABLE venues (
  id       TEXT PRIMARY KEY,
  stadium  TEXT NOT NULL,
  city     TEXT NOT NULL,
  country  TEXT NOT NULL,
  fun_fact TEXT NOT NULL
);

-- teams (depends on groups)
CREATE TABLE teams (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  short_code    TEXT NOT NULL,
  flag_emoji    TEXT NOT NULL,
  group_id      TEXT NOT NULL REFERENCES groups(id),
  seed          INTEGER NOT NULL,
  title_odds    TEXT NOT NULL,
  primary_hex   TEXT NOT NULL,
  secondary_hex TEXT NOT NULL,
  tertiary_hex  TEXT NOT NULL,
  on_primary    TEXT,
  on_secondary  TEXT,
  fun_fact      TEXT NOT NULL,
  texture_id    TEXT,
  form          TEXT[] NOT NULL DEFAULT '{}',
  fifa_code     TEXT,
  flag_url      TEXT,
  kit_image_url TEXT
);

-- players (depends on teams)
CREATE TABLE players (
  id           TEXT PRIMARY KEY,
  team_id      TEXT NOT NULL REFERENCES teams(id),
  name         TEXT NOT NULL,
  shirt_number INTEGER NOT NULL,
  position     TEXT NOT NULL CHECK (position IN ('GK','DEF','MID','FWD'))
);

-- fixtures (depends on teams, venues, groups)
CREATE TABLE fixtures (
  id                     TEXT PRIMARY KEY,
  home_team_id           TEXT NOT NULL REFERENCES teams(id),
  away_team_id           TEXT NOT NULL REFERENCES teams(id),
  venue_id               TEXT NOT NULL REFERENCES venues(id),
  group_id               TEXT REFERENCES groups(id),
  kickoff_utc            TIMESTAMPTZ NOT NULL,
  stage                  TEXT NOT NULL CHECK (stage IN ('group','r32','r16','qf','sf','final')),
  status                 TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','finished')),
  minute                 INTEGER,
  home_score             INTEGER,
  away_score             INTEGER,
  man_of_match_player_id TEXT REFERENCES players(id)
);

-- match_events (depends on fixtures, teams, players)
CREATE TABLE match_events (
  id               TEXT PRIMARY KEY,
  fixture_id       TEXT NOT NULL REFERENCES fixtures(id),
  minute           INTEGER NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('goal','own_goal','penalty','yellow','red','sub')),
  team_id          TEXT NOT NULL REFERENCES teams(id),
  player_id        TEXT NOT NULL REFERENCES players(id),
  assist_player_id TEXT REFERENCES players(id)
);

-- insights
CREATE TABLE insights (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind         TEXT NOT NULL,
  team_id      TEXT REFERENCES teams(id),
  value        TEXT NOT NULL,
  blurb        TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true
);

-- ── Standings view ────────────────────────────────────────────────
CREATE VIEW standings AS
WITH home_stats AS (
  SELECT
    home_team_id AS team_id,
    group_id,
    COUNT(*) FILTER (WHERE status = 'finished')                              AS played,
    COUNT(*) FILTER (WHERE status = 'finished' AND home_score > away_score)  AS won,
    COUNT(*) FILTER (WHERE status = 'finished' AND home_score = away_score)  AS drawn,
    COUNT(*) FILTER (WHERE status = 'finished' AND home_score < away_score)  AS lost,
    COALESCE(SUM(home_score) FILTER (WHERE status = 'finished'), 0)          AS goals_for,
    COALESCE(SUM(away_score) FILTER (WHERE status = 'finished'), 0)          AS goals_against
  FROM fixtures
  WHERE group_id IS NOT NULL
  GROUP BY home_team_id, group_id
),
away_stats AS (
  SELECT
    away_team_id AS team_id,
    group_id,
    COUNT(*) FILTER (WHERE status = 'finished')                              AS played,
    COUNT(*) FILTER (WHERE status = 'finished' AND away_score > home_score)  AS won,
    COUNT(*) FILTER (WHERE status = 'finished' AND away_score = home_score)  AS drawn,
    COUNT(*) FILTER (WHERE status = 'finished' AND away_score < home_score)  AS lost,
    COALESCE(SUM(away_score) FILTER (WHERE status = 'finished'), 0)          AS goals_for,
    COALESCE(SUM(home_score) FILTER (WHERE status = 'finished'), 0)          AS goals_against
  FROM fixtures
  WHERE group_id IS NOT NULL
  GROUP BY away_team_id, group_id
),
combined AS (
  SELECT
    t.id AS team_id,
    t.group_id,
    COALESCE(h.played, 0)        + COALESCE(a.played, 0)        AS played,
    COALESCE(h.won, 0)           + COALESCE(a.won, 0)           AS won,
    COALESCE(h.drawn, 0)         + COALESCE(a.drawn, 0)         AS drawn,
    COALESCE(h.lost, 0)          + COALESCE(a.lost, 0)          AS lost,
    COALESCE(h.goals_for, 0)     + COALESCE(a.goals_for, 0)     AS goals_for,
    COALESCE(h.goals_against, 0) + COALESCE(a.goals_against, 0) AS goals_against
  FROM teams t
  LEFT JOIN home_stats h ON h.team_id = t.id
  LEFT JOIN away_stats  a ON a.team_id = t.id
)
SELECT
  team_id,
  group_id,
  played, won, drawn, lost,
  goals_for, goals_against,
  goals_for - goals_against AS goal_diff,
  (won * 3 + drawn)         AS points
FROM combined;

-- ── Player stats view ─────────────────────────────────────────────
CREATE VIEW player_stats AS
WITH scorer_stats AS (
  SELECT
    player_id,
    COUNT(*) FILTER (WHERE type IN ('goal','penalty')) AS goals,
    COUNT(*) FILTER (WHERE type = 'yellow')            AS yellow_cards,
    COUNT(*) FILTER (WHERE type = 'red')               AS red_cards
  FROM match_events
  GROUP BY player_id
),
assist_stats AS (
  SELECT assist_player_id AS player_id, COUNT(*) AS assists
  FROM match_events
  WHERE assist_player_id IS NOT NULL
  GROUP BY assist_player_id
)
SELECT
  p.id                        AS player_id,
  p.name                      AS player_name,
  p.team_id,
  COALESCE(s.goals, 0)        AS goals,
  COALESCE(a.assists, 0)      AS assists,
  COALESCE(s.yellow_cards, 0) AS yellow_cards,
  COALESCE(s.red_cards, 0)    AS red_cards
FROM players p
LEFT JOIN scorer_stats s ON s.player_id = p.id
LEFT JOIN assist_stats  a ON a.player_id = p.id;

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues       ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures     ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON groups       FOR SELECT USING (true);
CREATE POLICY "public_read" ON venues       FOR SELECT USING (true);
CREATE POLICY "public_read" ON teams        FOR SELECT USING (true);
CREATE POLICY "public_read" ON players      FOR SELECT USING (true);
CREATE POLICY "public_read" ON fixtures     FOR SELECT USING (true);
CREATE POLICY "public_read" ON match_events FOR SELECT USING (true);
CREATE POLICY "public_read" ON insights     FOR SELECT USING (is_published = true);
