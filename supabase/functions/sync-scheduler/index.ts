/**
 * sync-scheduler
 *
 * Runs every minute via pg_cron. It:
 * - plans the current UK day once 04:00 UK has passed
 * - creates evenly-spread sync jobs for each fixture on that UK date
 * - executes due jobs in small batches against ESPN, the only scheduled live provider
 * - adds post-FT checks after a fixture is actually marked finished
 */

import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const UK_TIME_ZONE = 'Europe/London';
const PROJECT_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RUNNER_BATCH_SIZE = Number(Deno.env.get('SYNC_RUNNER_BATCH_SIZE') ?? 12);
const ESPN_DAILY_SYNC_CAP = Number(Deno.env.get('ESPN_DAILY_SYNC_CAP') ?? 1000);
const RUNNING_JOB_STALE_AFTER_MINUTES = Number(Deno.env.get('SYNC_RUNNING_JOB_STALE_AFTER_MINUTES') ?? 5);

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
  stage: string;
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

function addDaysToUkDate(ukDate: string, days: number): string {
  const middayUtc = new Date(`${ukDate}T12:00:00.000Z`);
  return ukParts(new Date(middayUtc.getTime() + days * 24 * 60 * 60 * 1000)).date;
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function isoAfter(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function plannedFixtureJobs(fixture: FixtureRow, ukDate: string): PlannedJob[] {
  const preMatchOffsets: Array<{ kind: string; minutes: number; priority: number }> = [
    { kind: 'pre_t60', minutes: -60, priority: 30 },
    { kind: 'pre_t15', minutes: -15, priority: 25 },
    { kind: 'pre_t02', minutes: -2, priority: 20 },
  ];
  // Knockout games can run deep into extra time and penalties. Keep polling for
  // four hours from kickoff so late UK starts, such as 02:30, are covered to 06:30.
  const liveJobCount = fixture.stage === 'group' ? 131 : 241;
  const liveOffsets = Array.from({ length: liveJobCount }, (_, minute) => ({
    kind: `live_m${String(minute).padStart(3, '0')}`,
    minutes: minute,
    priority: minute === 0 ? 5 : 10,
  }));
  const offsets = [...preMatchOffsets, ...liveOffsets];

  return offsets.map(offset => ({
    dedupe_key: `${fixture.id}:${offset.kind}`,
    fixture_id: fixture.id,
    uk_date: ukDate,
    run_at: addMinutes(fixture.kickoff_utc, offset.minutes),
    kind: offset.kind,
    provider: 'espn',
    priority: offset.priority,
    status: 'pending',
  }));
}

async function ensureFixtureJobsForDate(ukDate: string, log: string[]): Promise<{ fixtures: number; jobs: number }> {
  const { data: fixtures, error: fixtureError } = await supabaseAdmin
    .from('fixtures')
    .select('id, kickoff_utc, stage, status, home_team_id, away_team_id')
    .not('home_team_id', 'is', null)
    .not('away_team_id', 'is', null)
    .order('kickoff_utc');
  if (fixtureError) throw fixtureError;

  const nextUkDate = addDaysToUkDate(ukDate, 1);
  const fixturesToPlan = ((fixtures ?? []) as FixtureRow[])
    .map(fixture => ({ fixture, uk: ukParts(new Date(fixture.kickoff_utc)) }))
    .filter(({ uk }) => uk.date === ukDate || (uk.date === nextUkDate && uk.hour < 4));
  const jobs = fixturesToPlan.flatMap(({ fixture, uk }) => plannedFixtureJobs(fixture, uk.date));
  const futureOrRecentJobs = jobs.filter(job => new Date(job.run_at).getTime() >= Date.now() - 2 * 60_000);

  if (futureOrRecentJobs.length > 0) {
    const { error: jobError } = await supabaseAdmin
      .from('sync_schedule_jobs')
      .upsert(futureOrRecentJobs, { onConflict: 'dedupe_key', ignoreDuplicates: true });
    if (jobError) throw jobError;
  }

  const earlyNextDayFixtures = fixturesToPlan.filter(({ uk }) => uk.date === nextUkDate).length;
  log.push(
    `Ensured ${futureOrRecentJobs.length} jobs for ${fixturesToPlan.length} resolved fixtures on ${ukDate}` +
    (earlyNextDayFixtures > 0 ? `, including ${earlyNextDayFixtures} early fixture(s) on ${nextUkDate}` : ''),
  );
  return { fixtures: fixturesToPlan.length, jobs: futureOrRecentJobs.length };
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
    await ensureFixtureJobsForDate(ukDate, log);
    return;
  }

  const planned = await ensureFixtureJobsForDate(ukDate, log);
  const { error: dayError } = await supabaseAdmin
    .from('sync_schedule_days')
    .insert({
      uk_date: ukDate,
      fixture_count: planned.fixtures,
      notes: `Planned ${planned.jobs} sync jobs after 04:00 UK`,
    });
  if (dayError) throw dayError;

  log.push(`Planner recorded ${planned.jobs} jobs for ${planned.fixtures} fixtures on ${ukDate}`);
}

async function espnJobsDoneToday(ukDate: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('sync_schedule_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('uk_date', ukDate)
    .eq('provider', 'espn')
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
  for (const key of ['reqCount', 'groups', 'teams', 'players', 'fixtures', 'eventsInserted', 'fixtureUpdates', 'squadsFetched', 'scoreboardEvents', 'eventFetches', 'possibleEvents', 'mappableEvents']) {
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
  if (job.provider !== 'espn' || !job.fixture_id) return;

  const counts = dataCountsFromPayload(payload);
  if (numberFromCounts(counts, 'fixtureUpdates') > 0) return;

  const { data: fixture, error } = await supabaseAdmin
    .from('fixtures')
    .select('id, kickoff_utc, status, home_score, away_score, source, edited_by_admin')
    .eq('id', job.fixture_id)
    .maybeSingle();
  if (error) throw error;
  if (!fixture || fixture.edited_by_admin || fixture.status === 'finished') return;
  if (fixture.source === 'espn') return;

  const kickoffMs = new Date(fixture.kickoff_utc).getTime();
  const elapsedMinutes = Math.floor((Date.now() - kickoffMs) / 60_000);
  if (elapsedMinutes < 0 || elapsedMinutes > 105) return;

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

async function claimJob(job: SyncJob): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('sync_schedule_jobs')
    .update({
      status: 'running',
      attempts: job.attempts + 1,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function recoverStaleRunningJobs(now: Date, log: string[]) {
  const staleBefore = new Date(now.getTime() - RUNNING_JOB_STALE_AFTER_MINUTES * 60_000).toISOString();
  const { data: recovered, error } = await supabaseAdmin
    .from('sync_schedule_jobs')
    .update({
      status: 'pending',
      last_error: `Recovered stale running job after ${RUNNING_JOB_STALE_AFTER_MINUTES} minutes`,
      updated_at: now.toISOString(),
    })
    .eq('status', 'running')
    .lte('updated_at', staleBefore)
    .lt('attempts', 3)
    .select('id');
  if (error) throw error;
  if ((recovered ?? []).length > 0) {
    log.push(`Recovered ${(recovered ?? []).length} stale running job(s)`);
  }

  const { data: failed, error: failedError } = await supabaseAdmin
    .from('sync_schedule_jobs')
    .update({
      status: 'failed',
      last_error: `Marked stale running job failed after ${RUNNING_JOB_STALE_AFTER_MINUTES} minutes`,
      updated_at: now.toISOString(),
    })
    .eq('status', 'running')
    .lte('updated_at', staleBefore)
    .gte('attempts', 3)
    .select('id');
  if (failedError) throw failedError;
  if ((failed ?? []).length > 0) {
    log.push(`Marked ${(failed ?? []).length} stale running job(s) failed`);
  }
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
      provider: 'espn',
      priority: 3,
      status: 'pending',
    },
    {
      dedupe_key: `${job.fixture_id}:ft_actual_plus_15`,
      fixture_id: job.fixture_id,
      uk_date: job.uk_date,
      run_at: isoAfter(15),
      kind: 'ft_actual_plus_15',
      provider: 'espn',
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
  await recoverStaleRunningJobs(now, log);

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
    if (job.provider !== 'espn') {
      await markJob(job.id, {
        status: 'skipped',
        executed_at: new Date().toISOString(),
        last_error: `Unsupported scheduled provider: ${job.provider}`,
      });
      log.push(`Skipped ${job.kind}: unsupported scheduled provider ${job.provider}`);
      continue;
    }

    const providerDone = await espnJobsDoneToday(job.uk_date);
    if (providerDone >= ESPN_DAILY_SYNC_CAP) {
      log.push(`Daily ESPN cap reached for ${job.uk_date}: ${providerDone}/${ESPN_DAILY_SYNC_CAP}`);
      break;
    }

    try {
      const claimed = await claimJob(job);
      if (!claimed) {
        log.push(`Skipped ${job.kind}${job.fixture_id ? ` for ${job.fixture_id}` : ''}: already claimed`);
        continue;
      }

      const requestBody = {
        reason: job.kind,
        fixtureId: job.fixture_id,
        maxEvents: 1,
      };
      const runLogId = await createRunLog(job, requestBody);

      try {
        const result = await invokeFunction('sync-espn', requestBody);
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
