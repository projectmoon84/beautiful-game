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
};

type DbFixture = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_utc: string;
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
  competitions?: Array<{ details?: EspnDetail[] }>;
  boxscore?: unknown;
};

function ukDateFromIso(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso));
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
  const maxEvents = Number.isFinite(body.maxEvents)
    ? Math.max(0, Math.min(MAX_EVENT_FETCHES, Number(body.maxEvents)))
    : MAX_EVENT_FETCHES;
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
      .select('id, home_team_id, away_team_id, kickoff_utc, status, edited_by_admin')
      .not('home_team_id', 'is', null)
      .not('away_team_id', 'is', null);
    if (fixturesError) throw fixturesError;

    const fixtureRows = (dbFixtures ?? []) as DbFixture[];
    const targetFixture = targetFixtureId
      ? fixtureRows.find(fixture => fixture.id === targetFixtureId)
      : null;
    const date = body.dates
      ?? (targetFixture?.kickoff_utc ? ukDateFromIso(targetFixture.kickoff_utc).replaceAll('-', '') : ukDateFromIso(syncedAt).replaceAll('-', ''));

    const scoreboardUrl = `${ESPN_BASE}/scoreboard?dates=${date}&limit=100`;
    const scoreboard = await fetchJson<EspnScoreboard>(scoreboardUrl);
    apiRequests++;
    const events = scoreboard.events ?? [];
    log.push(`ESPN req ${apiRequests}: scoreboard ${date} -> ${events.length} events`);

    const dbByCodePair = new Map<string, DbFixture>();
    for (const fixture of fixtureRows) {
      if (!fixture.home_team_id || !fixture.away_team_id) continue;
      dbByCodePair.set(`${fixture.home_team_id}_${fixture.away_team_id}`, fixture);
    }

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

      const dbFixture = dbByCodePair.get(`${homeCode}_${awayCode}`);
      if (!dbFixture || dbFixture.edited_by_admin) continue;
      if (targetFixtureId && dbFixture.id !== targetFixtureId) continue;

      const status = competition?.status ?? event.status;
      const mappedStatus = mapStatus(status);
      updates.push({
        id: dbFixture.id,
        status: mappedStatus,
        minute: minuteFromStatus(status, mappedStatus),
        home_score: scoreNumber(home?.score),
        away_score: scoreNumber(away?.score),
        source: SOURCE,
        updated_at: syncedAt,
      });
      log.push(
        `ESPN update ${dbFixture.id}: ${mappedStatus} ${minuteFromStatus(status, mappedStatus) ?? '-'}' ${scoreNumber(home?.score) ?? '-'}-${scoreNumber(away?.score) ?? '-'}`,
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

      const details = [
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
        eventRows.push({
          id: eventId(fixtureId, detail, type, teamCode, athleteId, index),
          fixture_id: fixtureId,
          minute,
          type,
          team_id: teamCode,
          player_id: playerId,
          assist_player_id: null,
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
