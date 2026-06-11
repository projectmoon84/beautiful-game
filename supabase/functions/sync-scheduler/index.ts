/**
 * sync-scheduler
 *
 * Runs every 5 minutes via pg_cron. It:
 * - plans the current UK day once 04:00 UK has passed
 * - creates evenly-spread sync jobs for each fixture on that UK date
 * - executes due jobs in small batches against the live provider sync
 * - adds post-FT checks after a fixture is actually marked finished
 */

import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const UK_TIME_ZONE = 'Europe/London';
const PROJECT_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RUNNER_BATCH_SIZE = 3;
const DAILY_PROVIDER_SYNC_CAP = Number(Deno.env.get('SYNC_DAILY_PROVIDER_CAP') ?? 36);

type SyncJob = {
  id: string;
  fixture_id: string | null;
  uk_date: string;
  run_at: string;
  kind: string;
  provider: string;
  priority: number;
  attempts: number;
};

type FunctionResult = {
  status: number;
  payload: Record<string, unknown>;
};

type FixtureRow = {
  id: string;
  kickoff_utc: string;
  status: string;
  home_team_id: string | null;
  away_team_id: string | null;
};

type PlannedJob = {
  dedupe_key: string;
  fixture_id: string | null;
  uk_date: string;
  run_at: string;
  kind: string;
  provider: string;
  priority: number;
  status: 'pending';
};

function ukParts(date: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')),
  };
}

function fixtureUkDate(kickoffUtc: string): string {
  return ukParts(new Date(kickoffUtc)).date;
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function isoAfter(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function plannedFixtureJobs(fixture: FixtureRow, ukDate: string): PlannedJob[] {
  const offsets: Array<{ kind: string; minutes: number; priority: number }> = [
    { kind: 'pre_t60', minutes: -60, priority: 30 },
    { kind: 'pre_t15', minutes: -15, priority: 25 },
    { kind: 'pre_t02', minutes: -2, priority: 20 },
    { kind: 'live_08', minutes: 8, priority: 10 },
    { kind: 'live_16', minutes: 16, priority: 10 },
    { kind: 'live_24', minutes: 24, priority: 10 },
    { kind: 'live_32', minutes: 32, priority: 10 },
    { kind: 'live_40', minutes: 40, priority: 10 },
    { kind: 'ht_plus_08', minutes: 53, priority: 5 },
    { kind: 'second_08', minutes: 68, priority: 10 },
    { kind: 'second_16', minutes: 76, priority: 10 },
    { kind: 'second_24', minutes: 84, priority: 10 },
    { kind: 'second_32', minutes: 92, priority: 10 },
    { kind: 'second_40', minutes: 100, priority: 10 },
    { kind: 'ft_est_plus_08', minutes: 121, priority: 5 },
    { kind: 'ft_est_plus_15', minutes: 128, priority: 5 },
  ];

  return offsets.map(offset => ({
    dedupe_key: `${fixture.id}:${offset.kind}`,
    fixture_id: fixture.id,
    uk_date: ukDate,
    run_at: addMinutes(fixture.kickoff_utc, offset.minutes),
    kind: offset.kind,
    provider: 'api-football',
    priority: offset.priority,
    status: 'pending',
  }));
}

async function planTodayIfNeeded(now: Date, log: string[]) {
  const { date: ukDate, hour } = ukParts(now);
  if (hour < 4) {
    log.push(`Planner sleeping: UK hour ${hour} before 04:00`);
    return;
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('sync_schedule_days')
    .select('uk_date')
    .eq('uk_date', ukDate)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    log.push(`Planner already ran for ${ukDate}`);
    return;
  }

  const { data: fixtures, error: fixtureError } = await supabaseAdmin
    .from('fixtures')
    .select('id, kickoff_utc, status, home_team_id, away_team_id')
    .not('home_team_id', 'is', null)
    .not('away_team_id', 'is', null)
    .order('kickoff_utc');
  if (fixtureError) throw fixtureError;

  const todayFixtures = ((fixtures ?? []) as FixtureRow[])
    .filter(fixture => fixtureUkDate(fixture.kickoff_utc) === ukDate);

  const jobs: PlannedJob[] = todayFixtures.flatMap(fixture => plannedFixtureJobs(fixture, ukDate));
  const latestKickoff = todayFixtures.at(-1)?.kickoff_utc;
  if (latestKickoff) {
    jobs.push({
      dedupe_key: `${ukDate}:day_settle`,
      fixture_id: null,
      uk_date: ukDate,
      run_at: addMinutes(latestKickoff, 145),
      kind: `day_settle_${ukDate}`,
      provider: 'openfootball',
      priority: 40,
      status: 'pending',
    });
  }

  jobs.push({
    dedupe_key: `${ukDate}:daily_baseline`,
    fixture_id: null,
    uk_date: ukDate,
    run_at: now.toISOString(),
    kind: `daily_baseline_${ukDate}`,
    provider: 'openfootball',
    priority: 1,
    status: 'pending',
  });

  const { error: dayError } = await supabaseAdmin
    .from('sync_schedule_days')
    .insert({
      uk_date: ukDate,
      fixture_count: todayFixtures.length,
      notes: `Planned ${jobs.length} sync jobs after 04:00 UK`,
    });
  if (dayError) throw dayError;

  if (jobs.length > 0) {
    const { error: jobError } = await supabaseAdmin
      .from('sync_schedule_jobs')
      .upsert(jobs, { onConflict: 'dedupe_key', ignoreDuplicates: true });
    if (jobError) throw jobError;
  }

  log.push(`Planned ${jobs.length} jobs for ${todayFixtures.length} fixtures on ${ukDate}`);
}

async function providerJobsDoneToday(ukDate: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('sync_schedule_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('uk_date', ukDate)
    .eq('provider', 'api-football')
    .eq('status', 'done');
  if (error) throw error;
  return count ?? 0;
}

function responseLogFromPayload(payload: Record<string, unknown>): string[] {
  return Array.isArray(payload.log)
    ? payload.log.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function dataCountsFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const summary = payload.summary;
  const counts = payload.counts;

  if (counts && typeof counts === 'object' && !Array.isArray(counts)) {
    return counts as Record<string, unknown>;
  }

  const extracted: Record<string, unknown> = {};
  for (const key of ['reqCount', 'groups', 'teams', 'players', 'fixtures', 'eventsInserted', 'fixtureUpdates', 'squadsFetched']) {
    const value = payload[key];
    if (typeof value === 'number') extracted[key] = value;
  }

  if (summary && typeof summary === 'object' && !Array.isArray(summary)) {
    return { ...extracted, ...(summary as Record<string, unknown>) };
  }

  return extracted;
}

function numberFromCounts(counts: Record<string, unknown>, key: string): number {
  const value = counts[key];
  return typeof value === 'number' ? value : 0;
}

async function applyClockFallback(job: SyncJob, payload: Record<string, unknown>, log: string[]) {
  if (job.provider !== 'api-football' || !job.fixture_id) return;

  const counts = dataCountsFromPayload(payload);
  if (numberFromCounts(counts, 'fixtureUpdates') > 0) return;

  const { data: fixture, error } = await supabaseAdmin
    .from('fixtures')
    .select('id, kickoff_utc, status, home_score, away_score, edited_by_admin')
    .eq('id', job.fixture_id)
    .maybeSingle();
  if (error) throw error;
  if (!fixture || fixture.edited_by_admin || fixture.status === 'finished') return;

  const kickoffMs = new Date(fixture.kickoff_utc).getTime();
  const elapsedMinutes = Math.floor((Date.now() - kickoffMs) / 60_000);
  if (elapsedMinutes < 0 || elapsedMinutes > 135) return;

  const { error: updateError } = await supabaseAdmin
    .from('fixtures')
    .update({
      status: 'live',
      minute: Math.max(1, elapsedMinutes),
      home_score: fixture.home_score ?? 0,
      away_score: fixture.away_score ?? 0,
      source: 'clock-fallback',
      updated_at: new Date().toISOString(),
    })
    .eq('id', fixture.id)
    .eq('edited_by_admin', false);
  if (updateError) throw updateError;

  payload.counts = {
    ...counts,
    clockFallbackFixtureUpdates: 1,
    clockFallbackMinute: Math.max(1, elapsedMinutes),
  };
  log.push(`Clock fallback marked ${fixture.id} live at ${Math.max(1, elapsedMinutes)}'`);
}

async function createRunLog(job: SyncJob, requestBody: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('sync_run_logs')
    .insert({
      job_id: job.id,
      fixture_id: job.fixture_id,
      uk_date: job.uk_date,
      provider: job.provider,
      kind: job.kind,
      request_body: requestBody,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function finishRunLog(
  id: string,
  values: {
    success: boolean;
    statusCode?: number;
    payload?: Record<string, unknown>;
    error?: string;
  },
) {
  const payload = values.payload ?? {};
  const { error } = await supabaseAdmin
    .from('sync_run_logs')
    .update({
      finished_at: new Date().toISOString(),
      success: values.success,
      status_code: values.statusCode ?? null,
      response_summary: payload,
      response_log: responseLogFromPayload(payload),
      data_counts: dataCountsFromPayload(payload),
      error: values.error ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

async function invokeFunction(name: string, body: Record<string, unknown>): Promise<FunctionResult> {
  const response = await fetch(`${PROJECT_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(`${name} failed: ${JSON.stringify(payload)}`);
  }
  return { status: response.status, payload };
}

async function markJob(id: string, values: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from('sync_schedule_jobs')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

async function ensurePostFinishJobs(job: SyncJob, log: string[]) {
  if (!job.fixture_id) return;

  const { data: fixture, error } = await supabaseAdmin
    .from('fixtures')
    .select('id, status')
    .eq('id', job.fixture_id)
    .maybeSingle();
  if (error) throw error;
  if (fixture?.status !== 'finished') return;

  const rows = [
    {
      dedupe_key: `${job.fixture_id}:ft_actual_plus_08`,
      fixture_id: job.fixture_id,
      uk_date: job.uk_date,
      run_at: isoAfter(8),
      kind: 'ft_actual_plus_08',
      provider: 'api-football',
      priority: 3,
      status: 'pending',
    },
    {
      dedupe_key: `${job.fixture_id}:ft_actual_plus_15`,
      fixture_id: job.fixture_id,
      uk_date: job.uk_date,
      run_at: isoAfter(15),
      kind: 'ft_actual_plus_15',
      provider: 'api-football',
      priority: 3,
      status: 'pending',
    },
  ];

  const { error: upsertError } = await supabaseAdmin
    .from('sync_schedule_jobs')
    .upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true });
  if (upsertError) throw upsertError;
  log.push(`Ensured actual FT follow-up jobs for ${job.fixture_id}`);
}

async function runDueJobs(now: Date, log: string[]) {
  const { data, error } = await supabaseAdmin
    .from('sync_schedule_jobs')
    .select('id, fixture_id, uk_date, run_at, kind, provider, priority, attempts')
    .eq('status', 'pending')
    .lte('run_at', now.toISOString())
    .order('priority', { ascending: true })
    .order('run_at', { ascending: true })
    .limit(RUNNER_BATCH_SIZE);
  if (error) throw error;

  const jobs = (data ?? []) as SyncJob[];
  if (jobs.length === 0) {
    log.push('No due jobs');
    return;
  }

  for (const job of jobs) {
    const providerDone = job.provider === 'api-football'
      ? await providerJobsDoneToday(job.uk_date)
      : 0;
    if (providerDone >= DAILY_PROVIDER_SYNC_CAP) {
      log.push(`Daily provider cap reached for ${job.uk_date}: ${providerDone}/${DAILY_PROVIDER_SYNC_CAP}`);
      break;
    }

    try {
      await markJob(job.id, {
        status: 'running',
        attempts: job.attempts + 1,
        last_error: null,
      });

      const requestBody = job.provider === 'openfootball'
        ? { reason: job.kind }
        : {
          reason: job.kind,
          fixtureId: job.fixture_id,
          skipSquads: true,
          maxEvents: 4,
        };
      const runLogId = await createRunLog(job, requestBody);

      try {
        const result = job.provider === 'openfootball'
          ? await invokeFunction('sync-openfootball', requestBody)
          : await invokeFunction('sync-api-football', requestBody);
        await applyClockFallback(job, result.payload, log);

        await finishRunLog(runLogId, {
          success: true,
          statusCode: result.status,
          payload: result.payload,
        });
      } catch (err) {
        await finishRunLog(runLogId, {
          success: false,
          error: String(err),
        });
        throw err;
      }

      await markJob(job.id, {
        status: 'done',
        executed_at: new Date().toISOString(),
      });
      log.push(`Ran ${job.kind}${job.fixture_id ? ` for ${job.fixture_id}` : ''}`);
      await ensurePostFinishJobs(job, log);
    } catch (err) {
      const attempts = job.attempts + 1;
      await markJob(job.id, {
        status: attempts >= 3 ? 'failed' : 'pending',
        attempts,
        run_at: isoAfter(Math.min(15, 2 ** attempts)),
        last_error: String(err),
      });
      log.push(`ERROR ${job.kind}: ${err}`);
    }
  }
}

Deno.serve(async () => {
  const log: string[] = [];

  if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const now = new Date();
    await planTodayIfNeeded(now, log);
    await runDueJobs(now, log);

    return new Response(
      JSON.stringify({ ok: true, log }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    log.push(`ERROR: ${err}`);
    console.error('[sync-scheduler]', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err), log }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
