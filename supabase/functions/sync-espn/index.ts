/**
 * sync-espn
 *
 * Unofficial ESPN scoreboard/summary sync for live World Cup fixtures.
 * It needs no API key, so this is a good low-cost primary source for
 * live status, score, and clock updates. OpenFootball remains the baseline
 * fixture source; clock fallback remains the safety net.
 */

import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const SOURCE = 'espn';
const MAX_EVENT_FETCHES = 4;
const MAX_EVENT_FETCHES_BACKFILL = 64;
const ESPN_DATE_WINDOW_DAYS = [-1, 0, 1];
const MATCH_KICKOFF_TOLERANCE_MS = 36 * 60 * 60 * 1000;
const GROUP_STALE_LIVE_FINISH_AFTER_MINUTES = 125;
const KNOCKOUT_STALE_LIVE_FINISH_AFTER_MINUTES = 170;
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type SyncRequestBody = {
  fixtureId?: string;
  maxEvents?: number;
  reason?: string;
  dates?: string;
  backfill?: boolean;
};

type DbFixture = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_utc: string;
  stage: string;
  status: string;
  edited_by_admin: boolean;
};

type EspnCompetitor = {
  homeAway: 'home' | 'away';
  score?: string;
  team?: {
    id?: string;
    abbreviation?: string;
    displayName?: string;
    shortDisplayName?: string;
  };
};

type EspnStatus = {
  clock?: number;
  displayClock?: string;
  period?: number;
  type?: {
    name?: string;
    state?: string;
    completed?: boolean;
    description?: string;
    detail?: string;
    shortDetail?: string;
  };
};

type EspnEvent = {
  id: string;
  date?: string;
  name?: string;
  competitions?: Array<{
    id?: string;
    status?: EspnStatus;
    competitors?: EspnCompetitor[];
    details?: EspnDetail[];
  }>;
  status?: EspnStatus;
};

type EspnScoreboard = {
  events?: EspnEvent[];
};

type EspnDetail = {
  clock?: { displayValue?: string; value?: number };
  team?: { id?: string; abbreviation?: string; displayName?: string };
  athletesInvolved?: EspnAthlete[];
  athletes?: EspnAthlete[];
  participants?: Array<{ athlete?: EspnAthlete }>;
  type?: { id?: string; text?: string; abbreviation?: string };
  scoringPlay?: boolean;
  yellowCard?: boolean;
  redCard?: boolean;
  ownGoal?: boolean;
  penaltyKick?: boolean;
  text?: string;
  displayTime?: string;
};

type EspnAthlete = {
  id?: string;
  displayName?: string;
  shortName?: string;
  fullName?: string;
  jersey?: string;
  position?: string;
};

type EspnSummary = {
  details?: EspnDetail[];
  plays?: EspnDetail[];
  keyEvents?: EspnDetail[];
  competitions?: Array<{ details?: EspnDetail[] }>;
  boxscore?: unknown;
};

function ukDateFromIso(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso));
}

function ymdUtc(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function dateAtUtcMidday(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

function espnDateCandidatesForIso(iso: string): string[] {
  const utcDate = new Date(iso);
  const ukDate = ukDateFromIso(iso);
  const dates = new Set<string>();

  for (const offset of ESPN_DATE_WINDOW_DAYS) {
    dates.add(ymdUtc(addDays(utcDate, offset)));
    dates.add(ymdUtc(addDays(dateAtUtcMidday(ukDate), offset)));
  }

  return [...dates].sort();
}

function hasEspnMatch(events: EspnEvent[], homeCode: string, awayCode: string): boolean {
  return events.some(event => {
    const competitors = event.competitions?.[0]?.competitors ?? [];
    const home = competitors.find(competitor => competitor.homeAway === 'home');
    const away = competitors.find(competitor => competitor.homeAway === 'away');
    return home?.team?.abbreviation?.toUpperCase() === homeCode
      && away?.team?.abbreviation?.toUpperCase() === awayCode;
  });
}

function eventKickoffMs(event: EspnEvent): number | null {
  if (!event.date) return null;
  const parsed = new Date(event.date).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function bestFixtureForEspnEvent(
  fixtures: DbFixture[],
  event: EspnEvent,
): DbFixture | null {
  if (fixtures.length === 0) return null;
  if (fixtures.length === 1) return fixtures[0];

  const espnKickoffMs = eventKickoffMs(event);
  if (espnKickoffMs === null) return null;

  const ranked = fixtures
    .map(fixture => ({
      fixture,
      diff: Math.abs(new Date(fixture.kickoff_utc).getTime() - espnKickoffMs),
    }))
    .sort((a, b) => a.diff - b.diff);

  return ranked[0]?.diff <= MATCH_KICKOFF_TOLERANCE_MS ? ranked[0].fixture : null;
}

function scoreNumber(score: string | undefined): number | null {
  if (score === undefined || score === '') return null;
  const parsed = Number(score);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapStatus(status: EspnStatus | undefined): 'scheduled' | 'live' | 'finished' {
  const state = status?.type?.state?.toLowerCase();
  const name = status?.type?.name?.toLowerCase() ?? '';
  const description = status?.type?.description?.toLowerCase() ?? '';

  if (status?.type?.completed || state === 'post' || name.includes('final') || description.includes('final')) {
    return 'finished';
  }
  if (state === 'in' || state === 'live' || name.includes('in_progress') || description.includes('half')) {
    return 'live';
  }
  return 'scheduled';
}

function minuteFromStatus(status: EspnStatus | undefined, mappedStatus: string): number | null {
  if (mappedStatus !== 'live') return null;
  const display = status?.displayClock ?? status?.type?.shortDetail ?? status?.type?.detail ?? '';
  const displayMinute = display.match(/(\d+)'/)?.[1];
  if (displayMinute) return Number(displayMinute);

  const clock = status?.clock;
  if (typeof clock === 'number' && Number.isFinite(clock)) {
    const period = status?.period ?? 1;
    const elapsedInPeriod = Math.max(0, Math.ceil((45 * 60 - clock) / 60));
    return period <= 1 ? Math.max(1, elapsedInPeriod) : Math.max(46, 45 + elapsedInPeriod);
  }

  return null;
}

function normalizeStaleLiveStatus(
  fixture: DbFixture,
  mappedStatus: 'scheduled' | 'live' | 'finished',
  minute: number | null,
  homeScore: number | null,
  awayScore: number | null,
  syncedAt: string,
): 'scheduled' | 'live' | 'finished' {
  if (mappedStatus !== 'live' || minute === null || minute < 90 || homeScore === null || awayScore === null) {
    return mappedStatus;
  }

  const kickoffMs = new Date(fixture.kickoff_utc).getTime();
  const syncedMs = new Date(syncedAt).getTime();
  if (!Number.isFinite(kickoffMs) || !Number.isFinite(syncedMs)) return mappedStatus;

  const elapsedMinutes = Math.floor((syncedMs - kickoffMs) / 60_000);
  const finishAfterMinutes = fixture.stage === 'group'
    ? GROUP_STALE_LIVE_FINISH_AFTER_MINUTES
    : KNOCKOUT_STALE_LIVE_FINISH_AFTER_MINUTES;

  return elapsedMinutes >= finishAfterMinutes ? 'finished' : mappedStatus;
}

function eventMinute(detail: EspnDetail): number | null {
  const candidates = [
    detail.clock?.displayValue,
    detail.displayTime,
    detail.text,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const match = candidate.match(/(\d+)'/);
    if (match) return Number(match[1]);
  }

  if (typeof detail.clock?.value === 'number' && Number.isFinite(detail.clock.value)) {
    return Math.max(1, Math.ceil(detail.clock.value / 60));
  }

  return null;
}

function mapEventType(detail: EspnDetail): 'goal' | 'own_goal' | 'penalty' | 'yellow' | 'red' | 'sub' | null {
  const text = [
    detail.type?.text,
    detail.type?.abbreviation,
    detail.text,
  ].filter(Boolean).join(' ').toLowerCase();

  if (detail.redCard || text.includes('red card')) return 'red';
  if (detail.yellowCard || text.includes('yellow card')) return 'yellow';
  if (text.includes('substitution')) return 'sub';
  if (detail.scoringPlay || text.includes('goal')) {
    if (detail.ownGoal || text.includes('own goal')) return 'own_goal';
    if (detail.penaltyKick || text.includes('penalty')) return 'penalty';
    return 'goal';
  }

  return null;
}

function detailAthlete(detail: EspnDetail): { id?: string; name?: string } | null {
  const athlete = detail.athletesInvolved?.[0]
    ?? detail.athletes?.[0]
    ?? detail.participants?.find(participant => participant.athlete)?.athlete;
  if (!athlete) return null;
  return {
    id: athlete.id,
    name: athlete.displayName ?? athlete.shortName,
  };
}

function playerName(athlete: EspnAthlete | null): string | null {
  return athlete?.displayName ?? athlete?.fullName ?? athlete?.shortName ?? null;
}

function assistNameFromText(text: string | undefined): string | null {
  const match = text?.match(/\bAssisted by\s+(.+?)(?:\s+with\b|\.|$)/i);
  return match?.[1]?.trim() || null;
}

function playerIdPart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'unknown';
}

function playerPosition(position: string | undefined): 'GK' | 'DEF' | 'MID' | 'FWD' {
  const value = (position ?? '').toUpperCase();
  if (value.includes('GK') || value.includes('GOAL')) return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DF', 'DEF'].some(token => value.includes(token))) return 'DEF';
  if (['FW', 'FWD', 'ST', 'CF', 'LW', 'RW', 'ATT'].some(token => value.includes(token))) return 'FWD';
  return 'MID';
}

function playerShirtNumber(athlete: EspnAthlete | null): number {
  const parsed = Number(athlete?.jersey);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 99;
}

function eventId(fixtureId: string, detail: EspnDetail, type: string, teamCode: string, athleteId: string, index: number): string {
  const clock = eventMinute(detail) ?? detail.clock?.displayValue ?? detail.displayTime ?? index;
  const espnType = detail.type?.id ?? detail.type?.text ?? type;
  return `${fixtureId}-espn-${clock}-${teamCode}-${espnType}-${athleteId}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      'User-Agent': 'BeautifulGame/1.0',
    },
  });
  if (!response.ok) throw new Error(`ESPN HTTP ${response.status} for ${url}`);
  return await response.json() as T;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

Deno.serve(async (request) => {
  const body = (await request.json().catch(() => ({}))) as SyncRequestBody;
  const log: string[] = [];
  const syncedAt = new Date().toISOString();
  const defaultMax = body.backfill ? MAX_EVENT_FETCHES_BACKFILL : MAX_EVENT_FETCHES;
  const maxEvents = Number.isFinite(body.maxEvents)
    ? Math.max(0, Math.min(MAX_EVENT_FETCHES_BACKFILL, Number(body.maxEvents)))
    : defaultMax;
  const targetFixtureId = body.fixtureId;
  let apiRequests = 0;
  let fixtureUpdates = 0;
  let eventFetches = 0;
  let eventsInserted = 0;
  let possibleEvents = 0;
  let mappableEvents = 0;

  try {
    if (body.reason) log.push(`Reason: ${body.reason}`);
    if (targetFixtureId) log.push(`Target fixture: ${targetFixtureId}`);

    const { data: dbFixtures, error: fixturesError } = await supabaseAdmin
      .from('fixtures')
      .select('id, home_team_id, away_team_id, kickoff_utc, stage, status, edited_by_admin')
      .not('home_team_id', 'is', null)
      .not('away_team_id', 'is', null);
    if (fixturesError) throw fixturesError;

    const fixtureRows = (dbFixtures ?? []) as DbFixture[];
    const targetFixture = targetFixtureId
      ? fixtureRows.find(fixture => fixture.id === targetFixtureId)
      : null;
    const dbByCodePair = new Map<string, DbFixture[]>();
    for (const fixture of fixtureRows) {
      if (!fixture.home_team_id || !fixture.away_team_id) continue;
      const key = `${fixture.home_team_id}_${fixture.away_team_id}`;
      dbByCodePair.set(key, [...(dbByCodePair.get(key) ?? []), fixture]);
    }
    const targetPair = targetFixture?.home_team_id && targetFixture?.away_team_id
      ? { home: targetFixture.home_team_id, away: targetFixture.away_team_id }
      : null;

    // In backfill mode, collect all distinct dates that have finished or live fixtures.
    // Otherwise use the explicitly supplied date, the target fixture's date, or today.
    let datesToFetch: string[];
    if (body.backfill) {
      const uniqueDates = new Set<string>();
      for (const fixture of fixtureRows) {
        if (fixture.status === 'finished' || fixture.status === 'live') {
          for (const date of espnDateCandidatesForIso(fixture.kickoff_utc)) {
            uniqueDates.add(date);
          }
        }
      }
      datesToFetch = [...uniqueDates].sort();
      log.push(`Backfill mode: ${datesToFetch.length} date(s) to process: ${datesToFetch.join(', ')}`);
    } else {
      const candidates: string[] = [];
      if (body.dates) candidates.push(body.dates);
      if (targetFixture?.kickoff_utc) {
        candidates.push(...espnDateCandidatesForIso(targetFixture.kickoff_utc));
      } else {
        candidates.push(...espnDateCandidatesForIso(syncedAt));
      }
      datesToFetch = [...new Set(candidates)];
    }

    const eventsById = new Map<string, EspnEvent>();
    for (const date of datesToFetch) {
      const scoreboardUrl = `${ESPN_BASE}/scoreboard?dates=${date}&limit=100`;
      const scoreboard = await fetchJson<EspnScoreboard>(scoreboardUrl);
      apiRequests++;
      const dateEvents = scoreboard.events ?? [];
      log.push(`ESPN req ${apiRequests}: scoreboard ${date} -> ${dateEvents.length} events`);
      for (const event of dateEvents) {
        eventsById.set(event.id, event);
      }
      if (targetPair && hasEspnMatch(dateEvents, targetPair.home, targetPair.away)) {
        log.push(`Matched target fixture on ESPN date ${date}`);
        break;
      }
    }
    const events = [...eventsById.values()];

    const espnByFixtureId = new Map<string, { event: EspnEvent; teamIdToCode: Map<string, string> }>();
    const updates: Array<{
      id: string;
      status: string;
      minute: number | null;
      home_score: number | null;
      away_score: number | null;
      source: string;
      updated_at: string;
    }> = [];

    for (const event of events) {
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors ?? [];
      const home = competitors.find(competitor => competitor.homeAway === 'home');
      const away = competitors.find(competitor => competitor.homeAway === 'away');
      const homeCode = home?.team?.abbreviation?.toUpperCase();
      const awayCode = away?.team?.abbreviation?.toUpperCase();
      if (!homeCode || !awayCode) continue;
      const teamIdToCode = new Map<string, string>();
      if (home?.team?.id) teamIdToCode.set(String(home.team.id), homeCode);
      if (away?.team?.id) teamIdToCode.set(String(away.team.id), awayCode);

      const dbFixture = bestFixtureForEspnEvent(dbByCodePair.get(`${homeCode}_${awayCode}`) ?? [], event);
      if (!dbFixture || dbFixture.edited_by_admin) continue;
      if (targetFixtureId && dbFixture.id !== targetFixtureId) continue;

      const status = competition?.status ?? event.status;
      const mappedStatus = mapStatus(status);
      const minute = minuteFromStatus(status, mappedStatus);
      const homeScore = scoreNumber(home?.score);
      const awayScore = scoreNumber(away?.score);
      const normalizedStatus = normalizeStaleLiveStatus(
        dbFixture,
        mappedStatus,
        minute,
        homeScore,
        awayScore,
        syncedAt,
      );
      updates.push({
        id: dbFixture.id,
        status: normalizedStatus,
        minute: normalizedStatus === 'live' ? minute : null,
        home_score: homeScore,
        away_score: awayScore,
        source: SOURCE,
        updated_at: syncedAt,
      });
      log.push(
        `ESPN update ${dbFixture.id}: ${normalizedStatus}${normalizedStatus !== mappedStatus ? ` (normalized from ${mappedStatus})` : ''} ${minute ?? '-'}' ${homeScore ?? '-'}-${awayScore ?? '-'}`,
      );
      espnByFixtureId.set(dbFixture.id, { event, teamIdToCode });
    }

    if (updates.length > 0) {
      for (const update of updates) {
        const { id, ...values } = update;
        const { error } = await supabaseAdmin
          .from('fixtures')
          .update(values)
          .eq('id', id)
          .eq('edited_by_admin', false);
        if (error) throw error;
        fixtureUpdates++;
      }
      log.push(`Updated ${fixtureUpdates} fixture statuses/scores`);
    } else {
      log.push('No matching ESPN fixtures to update');
    }

    const eventQueue = [...espnByFixtureId.entries()]
      .filter(([fixtureId, entry]) => {
        const status = updates.find(update => update.id === fixtureId)?.status;
        const playByPlayAvailable = entry.event.competitions?.[0] && 'playByPlayAvailable' in entry.event.competitions[0]
          ? Boolean((entry.event.competitions[0] as Record<string, unknown>).playByPlayAvailable)
          : true;
        return playByPlayAvailable && (status === 'live' || status === 'finished');
      });

    for (const [queueIndex, [fixtureId, entry]] of eventQueue.entries()) {
      const { event, teamIdToCode } = entry;
      let summary: EspnSummary | null = null;
      if (queueIndex < maxEvents) {
        const summaryUrl = `${ESPN_BASE}/summary?event=${event.id}`;
        summary = await fetchJson<EspnSummary>(summaryUrl);
        apiRequests++;
        eventFetches++;
        log.push(`ESPN req ${apiRequests}: summary ${event.id}`);
      }

      // keyEvents is the richest source — it includes participants[1] for assists.
      // Prefer it; fall back to details/plays from older paths if empty.
      const keyEvents = summary?.keyEvents ?? [];
      const details = keyEvents.length > 0
        ? keyEvents
        : [
            ...(summary?.details ?? []),
            ...(summary?.plays ?? []),
            ...(summary?.competitions?.[0]?.details ?? []),
            ...(event.competitions?.[0]?.details ?? []),
          ];
      possibleEvents += details.length;
      log.push(`ESPN details ${event.id} -> ${details.length} details`);

      const playerRows = [];
      const eventRows = [];
      for (const [index, detail] of details.entries()) {
        const type = mapEventType(detail);
        const minute = eventMinute(detail);
        const teamCode = detail.team?.abbreviation?.toUpperCase()
          ?? (detail.team?.id ? teamIdToCode.get(String(detail.team.id)) : undefined);
        const athlete = detail.athletesInvolved?.[0]
          ?? detail.athletes?.[0]
          ?? detail.participants?.find(participant => participant.athlete)?.athlete
          ?? null;
        const athleteId = athlete?.id ?? `${index}`;
        const name = playerName(athlete);
        if (!type || !minute || !teamCode || !name) continue;
        mappableEvents++;
        const playerId = `${teamCode}-ESPN-${athleteId}`;
        playerRows.push({
          id: playerId,
          team_id: teamCode,
          name,
          shirt_number: playerShirtNumber(athlete),
          position: playerPosition(athlete?.position),
          source: SOURCE,
          updated_at: syncedAt,
        });

        // Assist: keyEvents puts the assist provider as participants[1]; older paths use athletesInvolved[1].
        const isGoalEvent = type === 'goal' || type === 'penalty';
        const assistAthlete = isGoalEvent
          ? (detail.participants?.[1]?.athlete ?? detail.athletesInvolved?.[1] ?? null)
          : null;
        const assistName = playerName(assistAthlete) ?? (isGoalEvent ? assistNameFromText(detail.text) : null);
        let assistPlayerId: string | null = null;
        if (assistName) {
          assistPlayerId = `${teamCode}-ESPN-${assistAthlete?.id ?? `assist-${playerIdPart(assistName)}`}`;
          playerRows.push({
            id: assistPlayerId,
            team_id: teamCode,
            name: assistName,
            shirt_number: playerShirtNumber(assistAthlete),
            position: playerPosition(assistAthlete?.position),
            source: SOURCE,
            updated_at: syncedAt,
          });
          log.push(`  assist: ${assistName}`);
        }

        eventRows.push({
          id: eventId(fixtureId, detail, type, teamCode, athleteId, index),
          fixture_id: fixtureId,
          minute,
          type,
          team_id: teamCode,
          player_id: playerId,
          assist_player_id: assistPlayerId,
          source: SOURCE,
          updated_at: syncedAt,
        });
        log.push(`Mapped ESPN detail ${fixtureId}: ${minute}' ${type} ${teamCode} ${name}`);
      }

      if (playerRows.length > 0) {
        const uniquePlayers = [...new Map(playerRows.map(player => [player.id, player])).values()];
        const { error } = await supabaseAdmin.from('players').upsert(uniquePlayers, { onConflict: 'id' });
        if (error) throw error;
      }

      if (eventRows.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from('match_events')
          .delete()
          .eq('fixture_id', fixtureId)
          .eq('source', SOURCE);
        if (deleteError) throw deleteError;

        const uniqueEvents = [...new Map(eventRows.map(event => [event.id, event])).values()];
        const { error } = await supabaseAdmin.from('match_events').upsert(uniqueEvents, { onConflict: 'id' });
        if (error) throw error;
        eventsInserted += uniqueEvents.length;
      }
    }

    log.push(`Total ESPN requests this run: ${apiRequests}`);

    return new Response(
      JSON.stringify({
        ok: true,
        reqCount: apiRequests,
        counts: {
          apiRequests,
          scoreboardEvents: events.length,
          fixtureUpdates,
          eventFetches,
          eventsInserted,
          possibleEvents,
          mappableEvents,
        },
        log,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    log.push(`ERROR: ${formatError(err)}`);
    console.error('[sync-espn]', err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: formatError(err),
        reqCount: apiRequests,
        counts: {
          apiRequests,
          scoreboardEvents: 0,
          fixtureUpdates,
          eventFetches,
          eventsInserted,
          possibleEvents,
          mappableEvents,
        },
        log,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
