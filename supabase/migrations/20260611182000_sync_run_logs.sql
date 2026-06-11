CREATE TABLE IF NOT EXISTS sync_run_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID REFERENCES sync_schedule_jobs(id) ON DELETE SET NULL,
  fixture_id       TEXT REFERENCES fixtures(id) ON DELETE SET NULL,
  uk_date          DATE,
  provider         TEXT NOT NULL,
  kind             TEXT NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at      TIMESTAMPTZ,
  success          BOOLEAN,
  status_code      INTEGER,
  request_body     JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_log     TEXT[] NOT NULL DEFAULT '{}',
  data_counts      JSONB NOT NULL DEFAULT '{}'::jsonb,
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_run_logs_job_idx
  ON sync_run_logs (job_id, started_at DESC);

CREATE INDEX IF NOT EXISTS sync_run_logs_day_idx
  ON sync_run_logs (uk_date, started_at DESC);

CREATE INDEX IF NOT EXISTS sync_run_logs_fixture_idx
  ON sync_run_logs (fixture_id, started_at DESC);

ALTER TABLE sync_run_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_run_logs_admin_read ON sync_run_logs;

CREATE POLICY sync_run_logs_admin_read
  ON sync_run_logs
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON sync_schedule_days TO authenticated;
GRANT SELECT ON sync_schedule_jobs TO authenticated;
GRANT SELECT ON sync_run_logs TO authenticated;
