DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  ) THEN
    RAISE EXCEPTION
      'Missing Vault secret SUPABASE_SERVICE_ROLE_KEY. Create it in Supabase Vault before applying this migration.';
  END IF;
END
$$;

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
    'sync-api-football-six-hourly'
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
  'sync-openfootball',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://btzuwdoqrlsnyqtsikwp.supabase.co/functions/v1/sync-openfootball',
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

SELECT cron.schedule(
  'sync-balldontlie',
  '30 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://btzuwdoqrlsnyqtsikwp.supabase.co/functions/v1/sync-balldontlie',
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

SELECT cron.schedule(
  'sync-api-football',
  '0 */6 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://btzuwdoqrlsnyqtsikwp.supabase.co/functions/v1/sync-api-football',
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
