CREATE OR REPLACE VIEW standings AS
WITH selected_fixtures AS (
  SELECT *
  FROM fixtures
  WHERE (
    EXISTS (SELECT 1 FROM fixtures WHERE id LIKE 'OF-%')
    AND id LIKE 'OF-%'
  )
  OR NOT EXISTS (SELECT 1 FROM fixtures WHERE id LIKE 'OF-%')
),
home_stats AS (
  SELECT
    home_team_id AS team_id,
    group_id,
    COUNT(*) FILTER (WHERE status = 'finished')                             AS played,
    COUNT(*) FILTER (WHERE status = 'finished' AND home_score > away_score) AS won,
    COUNT(*) FILTER (WHERE status = 'finished' AND home_score = away_score) AS drawn,
    COUNT(*) FILTER (WHERE status = 'finished' AND home_score < away_score) AS lost,
    COALESCE(SUM(home_score) FILTER (WHERE status = 'finished'), 0)         AS goals_for,
    COALESCE(SUM(away_score) FILTER (WHERE status = 'finished'), 0)         AS goals_against
  FROM selected_fixtures
  WHERE group_id IS NOT NULL
  GROUP BY home_team_id, group_id
),
away_stats AS (
  SELECT
    away_team_id AS team_id,
    group_id,
    COUNT(*) FILTER (WHERE status = 'finished')                             AS played,
    COUNT(*) FILTER (WHERE status = 'finished' AND away_score > home_score) AS won,
    COUNT(*) FILTER (WHERE status = 'finished' AND away_score = home_score) AS drawn,
    COUNT(*) FILTER (WHERE status = 'finished' AND away_score < home_score) AS lost,
    COALESCE(SUM(away_score) FILTER (WHERE status = 'finished'), 0)         AS goals_for,
    COALESCE(SUM(home_score) FILTER (WHERE status = 'finished'), 0)         AS goals_against
  FROM selected_fixtures
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
  LEFT JOIN home_stats h ON h.team_id = t.id AND h.group_id = t.group_id
  LEFT JOIN away_stats a ON a.team_id = t.id AND a.group_id = t.group_id
  WHERE t.fifa_code IS NOT NULL
)
SELECT
  team_id,
  group_id,
  played,
  won,
  drawn,
  lost,
  goals_for,
  goals_against,
  goals_for - goals_against AS goal_diff,
  won * 3 + drawn AS points
FROM combined;

CREATE OR REPLACE VIEW player_stats AS
WITH selected_fixtures AS (
  SELECT id
  FROM fixtures
  WHERE (
    EXISTS (SELECT 1 FROM fixtures WHERE id LIKE 'OF-%')
    AND id LIKE 'OF-%'
  )
  OR NOT EXISTS (SELECT 1 FROM fixtures WHERE id LIKE 'OF-%')
),
selected_events AS (
  SELECT e.*
  FROM match_events e
  INNER JOIN selected_fixtures f ON f.id = e.fixture_id
),
scorer_stats AS (
  SELECT
    player_id,
    COUNT(*) FILTER (WHERE type IN ('goal','penalty')) AS goals,
    COUNT(*) FILTER (WHERE type = 'yellow')            AS yellow_cards,
    COUNT(*) FILTER (WHERE type = 'red')               AS red_cards
  FROM selected_events
  GROUP BY player_id
),
assist_stats AS (
  SELECT assist_player_id AS player_id, COUNT(*) AS assists
  FROM selected_events
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
LEFT JOIN assist_stats a ON a.player_id = p.id
WHERE EXISTS (
  SELECT 1
  FROM teams t
  WHERE t.id = p.team_id
  AND t.fifa_code IS NOT NULL
);
