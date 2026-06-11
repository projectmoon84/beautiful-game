DO $$
DECLARE
  job_name text;
BEGIN
  FOREACH job_name IN ARRAY ARRAY[
    'sync-openfootball',
    'sync-openfootball-hourly',
    'sync-balldontlie',
    'sync-balldontlie-hourly',
    'sync-api-football',
    'sync-api-football-six-hourly',
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
