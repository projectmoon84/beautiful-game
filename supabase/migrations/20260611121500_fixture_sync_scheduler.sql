CREATE TABLE IF NOT EXISTS sync_schedule_days (
  uk_date       DATE PRIMARY KEY,
  planned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  fixture_count INTEGER NOT NULL DEFAULT 0,
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS sync_schedule_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key  TEXT NOT NULL UNIQUE,
  fixture_id  TEXT REFERENCES fixtures(id) ON DELETE CASCADE,
  uk_date     DATE NOT NULL,
  run_at      TIMESTAMPTZ NOT NULL,
  kind        TEXT NOT NULL,
  provider    TEXT NOT NULL DEFAULT 'api-football',
  priority    INTEGER NOT NULL DEFAULT 50,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed','skipped')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ,
  last_error  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_schedule_jobs_due_idx
  ON sync_schedule_jobs (status, run_at, priority);

ALTER TABLE sync_schedule_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_schedule_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_schedule_days_admin_read ON sync_schedule_days;
DROP POLICY IF EXISTS sync_schedule_jobs_admin_read ON sync_schedule_jobs;

CREATE POLICY sync_schedule_days_admin_read
  ON sync_schedule_days
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY sync_schedule_jobs_admin_read
  ON sync_schedule_jobs
  FOR SELECT
  TO authenticated
  USING (true);

DO $$
DECLARE
  job_name text;
BEGIN
  FOREACH job_name IN ARRAY ARRAY[
    'sync-balldontlie',
    'sync-api-football',
    'fixture-sync-scheduler'
  ]
  LOOP
    BEGIN
      PERFORM cron.unschedule(job_name);
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END LOOP;
END
$$;

SELECT cron.schedule(
  'fixture-sync-scheduler',
  '*/5 * * * *',
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
