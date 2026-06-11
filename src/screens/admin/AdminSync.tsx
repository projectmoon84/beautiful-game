import { useEffect, useMemo, useState } from 'react';
import { dataService } from '../../data/dataService';
import { supabase } from '../../data/supabase';
import type { Json } from '../../data/database.types';

interface SyncDay {
  uk_date: string;
  planned_at: string;
  fixture_count: number;
  notes: string | null;
}

interface SyncJob {
  id: string;
  fixture_id: string | null;
  uk_date: string;
  run_at: string;
  kind: string;
  provider: string;
  priority: number;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  attempts: number;
  executed_at: string | null;
  last_error: string | null;
}

interface SyncRunLog {
  id: string;
  job_id: string | null;
  fixture_id: string | null;
  provider: string;
  kind: string;
  started_at: string;
  finished_at: string | null;
  success: boolean | null;
  status_code: number | null;
  request_body: Json;
  response_log: string[];
  data_counts: Record<string, Json>;
  error: string | null;
}

const statusClass: Record<SyncJob['status'], string> = {
  pending: 'bg-gray-100 text-gray-500',
  running: 'bg-blue-50 text-blue-600',
  done: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-600',
  skipped: 'bg-amber-50 text-amber-700',
};

function ukDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  }).format(new Date(iso));
}

function prettyKind(kind: string) {
  return kind
    .replace(/^daily_baseline_.+$/, 'Daily baseline')
    .replace(/^day_settle_.+$/, 'Final day settle')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function jsonObject(value: Json): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, Json>
    : {};
}

function CountPill({ label, value }: { label: string; value: Json | undefined }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
      {label}: <span className="font-mono">{String(value)}</span>
    </span>
  );
}

export default function AdminSync() {
  const [days, setDays] = useState<SyncDay[]>([]);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [logs, setLogs] = useState<SyncRunLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(ukDateString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fixtureMap = useMemo(() => new Map(dataService.allFixtures().map(fixture => [fixture.id, fixture])), []);
  const teamMap = useMemo(() => new Map(dataService.allTeams().map(team => [team.id, team])), []);
  const latestLogByJob = useMemo(() => {
    const map = new Map<string, SyncRunLog>();
    for (const log of logs) {
      if (!log.job_id || map.has(log.job_id)) continue;
      map.set(log.job_id, log);
    }
    return map;
  }, [logs]);

  async function loadSyncData(date = selectedDate) {
    if (!supabase) return;
    setLoading(true);
    setError('');

    const client = supabase as any;
    const [daysResult, jobsResult, logsResult] = await Promise.all([
      client.from('sync_schedule_days').select('*').order('uk_date', { ascending: false }).limit(14),
      client.from('sync_schedule_jobs').select('*').eq('uk_date', date).order('run_at', { ascending: true }),
      client.from('sync_run_logs').select('*').eq('uk_date', date).order('started_at', { ascending: false }),
    ]);

    if (daysResult.error || jobsResult.error || logsResult.error) {
      setError(daysResult.error?.message ?? jobsResult.error?.message ?? logsResult.error?.message ?? 'Unable to load sync data');
    } else {
      setDays(daysResult.data ?? []);
      setJobs(jobsResult.data ?? []);
      setLogs((logsResult.data ?? []).map((row: any) => ({
        ...row,
        data_counts: jsonObject(row.data_counts),
        response_log: Array.isArray(row.response_log) ? row.response_log : [],
      })));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSyncData(selectedDate);
    const interval = window.setInterval(() => loadSyncData(selectedDate), 60_000);
    return () => window.clearInterval(interval);
  }, [selectedDate]);

  function fixtureLabel(fixtureId: string | null) {
    if (!fixtureId) return 'Whole-day sync';
    const fixture = fixtureMap.get(fixtureId);
    if (!fixture) return fixtureId;
    const home = teamMap.get(fixture.homeTeamId);
    const away = teamMap.get(fixture.awayTeamId);
    return `${home?.shortCode ?? fixture.homeTeamId} vs ${away?.shortCode ?? fixture.awayTeamId}`;
  }

  const selectedDay = days.find(day => day.uk_date === selectedDate);
  const statusCounts = jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.status] = (acc[job.status] ?? 0) + 1;
    return acc;
  }, {});
  const successCount = logs.filter(log => log.success === true).length;
  const failureCount = logs.filter(log => log.success === false).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#14161a]">Sync monitor</h1>
          <p className="mt-1 text-sm text-gray-400">
            Today’s planned syncs, run outcomes, and provider response details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedDate}
            onChange={event => setSelectedDate(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value={ukDateString()}>Today ({ukDateString()})</option>
            {days.map(day => (
              <option key={day.uk_date} value={day.uk_date}>
                {day.uk_date}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => loadSyncData()}
            disabled={loading}
            className="rounded-lg bg-[#14161a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Fixtures planned" value={selectedDay?.fixture_count ?? 0} />
        <SummaryCard label="Jobs" value={jobs.length} detail={`${statusCounts.done ?? 0} done · ${statusCounts.pending ?? 0} pending`} />
        <SummaryCard label="Successful runs" value={successCount} detail={`${failureCount} failed`} />
        <SummaryCard label="Last planned" value={selectedDay ? formatTime(selectedDay.planned_at) : '—'} detail={selectedDay?.notes ?? 'No plan found'} />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-bold text-[#14161a]">Daily sync plan</h2>
          <span className="text-[11px] font-semibold text-gray-400">Times shown in UK time</span>
        </div>

        {jobs.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-300">
            No sync jobs planned for this date yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobs.map(job => {
              const log = latestLogByJob.get(job.id);
              const counts = log?.data_counts ?? {};
              const isExpanded = expanded === job.id;

              return (
                <div key={job.id} className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : job.id)}
                    className="flex w-full items-center gap-4 text-left"
                  >
                    <div className="w-14 shrink-0 font-mono text-sm text-gray-500">{formatTime(job.run_at)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#14161a]">{prettyKind(job.kind)}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-400">
                          {job.provider}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass[job.status]}`}>
                          {job.status}
                        </span>
                        {log?.success === true && <span className="text-[11px] font-semibold text-green-600">Success</span>}
                        {log?.success === false && <span className="text-[11px] font-semibold text-red-500">Failed</span>}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">{fixtureLabel(job.fixture_id)}</div>
                    </div>
                    <div className="hidden max-w-[360px] flex-wrap justify-end gap-1.5 sm:flex">
                      <CountPill label="requests" value={counts.apiRequests ?? counts.reqCount} />
                      <CountPill label="fixtures" value={counts.fixtureUpdates ?? counts.fixtures} />
                      <CountPill label="events" value={counts.eventsInserted} />
                      <CountPill label="players" value={counts.squadsFetched ?? counts.players} />
                    </div>
                    <span className="text-lg text-gray-300">{isExpanded ? '−' : '+'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                      <div className="grid gap-3 text-xs md:grid-cols-3">
                        <Detail label="Scheduled" value={new Date(job.run_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })} />
                        <Detail label="Executed" value={formatTime(job.executed_at)} />
                        <Detail label="Attempts" value={String(job.attempts)} />
                        <Detail label="HTTP" value={log?.status_code ? String(log.status_code) : '—'} />
                        <Detail label="Started" value={formatTime(log?.started_at ?? null)} />
                        <Detail label="Finished" value={formatTime(log?.finished_at ?? null)} />
                      </div>

                      {(job.last_error || log?.error) && (
                        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                          {job.last_error ?? log?.error}
                        </div>
                      )}

                      {log && (
                        <>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {Object.entries(counts).map(([key, value]) => (
                              <CountPill key={key} label={key} value={value} />
                            ))}
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <JsonBlock label="Request" value={log.request_body} />
                            <JsonBlock label="Counts" value={counts} />
                          </div>

                          {log.response_log.length > 0 && (
                            <div className="mt-3">
                              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Provider log</div>
                              <div className="max-h-52 overflow-auto rounded-md bg-[#14161a] p-3 font-mono text-[11px] leading-5 text-white/75">
                                {log.response_log.map((line, index) => (
                                  <div key={`${log.id}-${index}`}>{line}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-[#14161a]">{value}</div>
      {detail && <div className="mt-1 truncate text-xs text-gray-400">{detail}</div>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <div className="mt-1 text-gray-700">{value}</div>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <pre className="max-h-40 overflow-auto rounded-md bg-white p-3 text-[11px] leading-5 text-gray-500 ring-1 ring-gray-100">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
