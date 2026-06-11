-- Use ESPN as the primary live-match sync provider.
-- API-Football remains available as a manual/secondary function, but the
-- scheduler should spend its live polling budget on the free ESPN feed first.

UPDATE sync_schedule_jobs
SET
  provider = 'espn',
  updated_at = now()
WHERE provider = 'api-football'
  AND status IN ('pending', 'failed')
  AND run_at >= now() - interval '2 hours';
