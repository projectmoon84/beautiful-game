-- Move the live ESPN scheduler to one-minute polling.
-- Completed jobs and their run logs are preserved; only pending/failed ESPN
-- fixture jobs for current/future UK dates are rebuilt.

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('fixture-sync-scheduler');
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
END
$$;

SELECT cron.schedule(
  'fixture-sync-scheduler',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://btzuwdoqrlsnyqtsikwp.supabase.co/functions/v1/sync-scheduler',
    headers := jsonb_build_object(
      'Content-Type',
      'application/json',
      'Authorization',
      'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
        LIMIT 1
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);

WITH fixture_scope AS (
  SELECT
    id,
    kickoff_utc,
    (kickoff_utc AT TIME ZONE 'Europe/London')::date AS uk_date
  FROM fixtures
  WHERE home_team_id IS NOT NULL
    AND away_team_id IS NOT NULL
    AND (kickoff_utc AT TIME ZONE 'Europe/London')::date >= (now() AT TIME ZONE 'Europe/London')::date
)
DELETE FROM sync_schedule_jobs jobs
USING fixture_scope fixtures
WHERE jobs.fixture_id = fixtures.id
  AND jobs.provider = 'espn'
  AND jobs.status IN ('pending', 'failed')
  AND jobs.uk_date >= (now() AT TIME ZONE 'Europe/London')::date;

WITH fixture_scope AS (
  SELECT
    id,
    kickoff_utc,
    (kickoff_utc AT TIME ZONE 'Europe/London')::date AS uk_date
  FROM fixtures
  WHERE home_team_id IS NOT NULL
    AND away_team_id IS NOT NULL
    AND (kickoff_utc AT TIME ZONE 'Europe/London')::date >= (now() AT TIME ZONE 'Europe/London')::date
),
offsets AS (
  SELECT 'pre_t60' AS kind, -60 AS minutes, 30 AS priority
  UNION ALL SELECT 'pre_t15', -15, 25
  UNION ALL SELECT 'pre_t02', -2, 20
  UNION ALL
  SELECT
    'live_m' || lpad(minute::text, 3, '0') AS kind,
    minute AS minutes,
    CASE WHEN minute = 0 THEN 5 ELSE 10 END AS priority
  FROM generate_series(0, 130) AS minute
)
INSERT INTO sync_schedule_jobs (
  dedupe_key,
  fixture_id,
  uk_date,
  run_at,
  kind,
  provider,
  priority,
  status
)
SELECT
  fixtures.id || ':' || offsets.kind,
  fixtures.id,
  fixtures.uk_date,
  fixtures.kickoff_utc + (offsets.minutes || ' minutes')::interval,
  offsets.kind,
  'espn',
  offsets.priority,
  'pending'
FROM fixture_scope fixtures
CROSS JOIN offsets
WHERE fixtures.kickoff_utc + (offsets.minutes || ' minutes')::interval >= now() - interval '2 minutes'
ON CONFLICT (dedupe_key) DO NOTHING;

UPDATE sync_schedule_days
SET notes = 'Planned one-minute ESPN live syncs after 04:00 UK'
WHERE uk_date >= (now() AT TIME ZONE 'Europe/London')::date;
