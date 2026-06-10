/**
 * sync-balldontlie
 *
 * Syncs 2026 World Cup squads, live/final scores and real match events from the
 * BALLDONTLIE FIFA World Cup API (https://fifa.balldontlie.io) into Supabase.
 *
 * Rows with edited_by_admin = true are never overwritten.
 * Trial/free limits can be as low as 5 req/min, so requests are paced.
 *
 * Deploy:   supabase functions deploy sync-balldontlie
 * Secrets:  supabase secrets set BALLDONTLIE_API_KEY=your_key_here
 * Schedule: in Supabase dashboard -> Edge Functions -> Schedule -> "30 * * * *"
 * Manual:   curl -X POST $SUPABASE_URL/functions/v1/sync-balldontlie \
 *             -H "Authorization: Bearer $SUPABASE_ANON_KEY"
 */

import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const BASE_URL = 'https://api.balldontlie.io/fifa/worldcup/v1';
const API_KEY = Deno.env.get('BALLDONTLIE_API_KEY') ?? '';
const SEASON = 2026;
const REQUEST_PAUSE_MS = 12_500;
const EVENT_MATCH_BATCH_SIZE = 8;
const SOURCE = 'balldontlie';

const POSITION_MAP: Record<string, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  GK: 'GK',
  G: 'GK',
  Goalkeeper: 'GK',
  DEF: 'DEF',
  D: 'DEF',
  Defender: 'DEF',
  M: 'MID',
  MID: 'MID',
  Midfielder: 'MID',
  F: 'FWD',
  FW: 'FWD',
  FWD: 'FWD',
  Forward: 'FWD',
  Attacker: 'FWD',
};

interface BDTeam {
  id: number;
  name: string;
  abbreviation?: string | null;
  country_code?: string | null;
}

interface BDPlayer {
  id: number;
  name: string;
  short_name?: string | null;
  position?: string | null;
  jersey_number?: string | number | null;
}

interface BDRoster {
  season: { year: number };
  team_id: number;
  player: BDPlayer;
  position?: string | null;
}

interface BDMatch {
  id: number;
  match_number?: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'cancelled' | string;
  home_team: BDTeam | null;
  away_team: BDTeam | null;
  home_score: number | null;
  away_score: number | null;
}

interface BDEvent {
  id: number;
  match_id: number;
  incident_type: string;
  incident_class?: string | null;
  time_minute?: number | null;
  added_time?: number | null;
  is_home?: boolean | null;
  player?: BDPlayer | null;
  assist_player?: BDPlayer | null;
  player_in?: BDPlayer | null;
  player_out?: BDPlayer | null;
}

interface BDFuture {
  id: number;
  market_type: string;
  market_name?: string | null;
  subject?: BDTeam | null;
  vendor?: string | null;
  american_odds?: number | null;
  decimal_odds?: number | null;
  updated_at?: string | null;
}

interface DbFixture {
  id: string;
  home_team_id: string;
  away_team_id: string;
  status: string;
  edited_by_admin: boolean;
}

interface PlayerRow {
  id: string;
  team_id: string;
  name: string;
  shirt_number: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  source: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  fixture_id: string;
  minute: number;
  type: 'goal' | 'own_goal' | 'penalty' | 'yellow' | 'red' | 'sub';
  team_id: string;
  player_id: string;
  assist_player_id?: string | null;
  source: string;
  updated_at: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function appendParam(path: string, key: string, value: string | number): string {
  return `${path}${path.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(String(value))}`;
}

function appendArrayParam(path: string, key: string, values: Array<string | number>): string {
  let nextPath = path;
  for (const value of values) {
    nextPath = appendParam(nextPath, `${key}[]`, value);
  }
  return nextPath;
}

async function bdFetch(path: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: API_KEY },
  });
}

async function bdFetchAll<T>(path: string, log: string[]): Promise<T[]> {
  const results: T[] = [];
  let cursor: number | undefined;
  let page = 0;

  for (;;) {
    const url = appendParam(cursor ? appendParam(path, 'cursor', cursor) : path, 'per_page', 100);
    const res = await bdFetch(url);

    if (!res.ok) {
      const body = await res.text();
      log.push(`WARN ${url} -> HTTP ${res.status}: ${body.slice(0, 160)}`);
      break;
    }

    const json = await res.json() as { data?: T[]; meta?: { next_cursor?: number } };
    results.push(...(json.data ?? []));
    cursor = json.meta?.next_cursor;
    page++;

    if (!cursor) break;
    log.push(`Fetched page ${page} from ${path}`);
    await sleep(REQUEST_PAUSE_MS);
  }

  return results;
}

function teamCode(team: BDTeam | null | undefined): string | undefined {
  return team?.abbreviation?.toUpperCase() || team?.country_code?.toUpperCase() || undefined;
}

function mapPosition(position?: string | null): 'GK' | 'DEF' | 'MID' | 'FWD' {
  return POSITION_MAP[position ?? ''] ?? 'MID';
}

function shirtNumber(value?: string | number | null): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 99;
}

function playerRow(teamId: string, player: BDPlayer, syncedAt: string, position?: string | null): PlayerRow {
  return {
    id: `${teamId}-${player.id}`,
    team_id: teamId,
    name: player.short_name || player.name,
    shirt_number: shirtNumber(player.jersey_number),
    position: mapPosition(position ?? player.position),
    source: SOURCE,
    updated_at: syncedAt,
  };
}

function mapMatchStatus(status: string): 'scheduled' | 'live' | 'finished' {
  if (status === 'in_progress') return 'live';
  if (status === 'completed') return 'finished';
  return 'scheduled';
}

function stageIdFromMatchNumber(matchNumber?: number | null): string | undefined {
  return matchNumber ? `OF-${matchNumber}` : undefined;
}

function matchKey(homeTeamId: string, awayTeamId: string): string {
  return `${homeTeamId}_${awayTeamId}`;
}

function fixtureForMatch(
  match: BDMatch,
  byId: Map<string, DbFixture>,
  byPair: Map<string, DbFixture>,
): DbFixture | undefined {
  const byMatchNumber = stageIdFromMatchNumber(match.match_number);
  if (byMatchNumber && byId.has(byMatchNumber)) return byId.get(byMatchNumber);

  const homeTeamId = teamCode(match.home_team);
  const awayTeamId = teamCode(match.away_team);
  if (!homeTeamId || !awayTeamId) return undefined;
  return byPair.get(matchKey(homeTeamId, awayTeamId));
}

function mapEventType(event: BDEvent): EventRow['type'] | null {
  const type = event.incident_type;
  const klass = (event.incident_class ?? '').toLowerCase();

  if (type === 'goal') {
    if (klass.includes('own')) return 'own_goal';
    if (klass.includes('penalty')) return 'penalty';
    return 'goal';
  }

  if (type === 'card') {
    if (klass.includes('yellow')) return 'yellow';
    if (klass.includes('red')) return 'red';
    return null;
  }

  if (type === 'substitution') return 'sub';
  return null;
}

function eventMinute(event: BDEvent): number | null {
  if (typeof event.time_minute !== 'number') return null;
  return event.time_minute + (event.added_time ?? 0);
}

function eventTeamId(event: BDEvent, fixture: DbFixture): string | null {
  if (event.is_home === true) return fixture.home_team_id;
  if (event.is_home === false) return fixture.away_team_id;
  return null;
}

function eventPlayer(event: BDEvent): BDPlayer | null | undefined {
  if (event.incident_type === 'substitution') return event.player_in ?? event.player_out ?? event.player;
  return event.player;
}

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }

  return x || 1;
}

function americanOddsToFractional(americanOdds: number): string | null {
  if (!Number.isFinite(americanOdds) || americanOdds === 0) return null;

  const numerator = americanOdds > 0 ? Math.round(americanOdds) : 100;
  const denominator = americanOdds > 0 ? 100 : Math.abs(Math.round(americanOdds));
  const divisor = greatestCommonDivisor(numerator, denominator);

  return `${numerator / divisor}/${denominator / divisor}`;
}

function futuresPriority(future: BDFuture): number {
  const vendor = future.vendor?.toLowerCase();
  if (vendor === 'draftkings') return 0;
  if (vendor === 'fanduel') return 1;
  return 2;
}

function eventToRow(event: BDEvent, fixture: DbFixture, syncedAt: string): { row: EventRow; players: PlayerRow[] } | null {
  const type = mapEventType(event);
  const minute = eventMinute(event);
  const teamId = eventTeamId(event, fixture);
  const player = eventPlayer(event);

  if (!type || minute === null || !teamId || !player) return null;

  const players = [playerRow(teamId, player, syncedAt)];
  let assistPlayerId: string | null = null;

  if (event.assist_player && (type === 'goal' || type === 'penalty')) {
    const assist = playerRow(teamId, event.assist_player, syncedAt);
    players.push(assist);
    assistPlayerId = assist.id;
  }

  return {
    row: {
      id: `${fixture.id}-BDL-${event.id}`,
      fixture_id: fixture.id,
      minute,
      type,
      team_id: teamId,
      player_id: `${teamId}-${player.id}`,
      assist_player_id: assistPlayerId,
      source: SOURCE,
      updated_at: syncedAt,
    },
    players,
  };
}

Deno.serve(async () => {
  const log: string[] = [];
  const syncedAt = new Date().toISOString();

  if (!API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: 'BALLDONTLIE_API_KEY secret not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    log.push('Fetching BALLDONTLIE FIFA teams...');
    const teams = await bdFetchAll<BDTeam>(`/teams?seasons[]=${SEASON}`, log);
    const bdlTeamToOurs = new Map<number, string>();

    for (const team of teams) {
      const code = teamCode(team);
      if (code) bdlTeamToOurs.set(team.id, code);
    }

    log.push(`Mapped ${bdlTeamToOurs.size}/${teams.length} teams by abbreviation/country_code`);

    log.push('Fetching BALLDONTLIE FIFA futures odds...');
    await sleep(REQUEST_PAUSE_MS);
    const futures = await bdFetchAll<BDFuture>(`/odds/futures?seasons[]=${SEASON}`, log);
    const titleOddsByTeam = new Map<string, { odds: string; priority: number }>();

    for (const future of futures) {
      if (future.market_type !== 'outright') continue;

      const teamId = teamCode(future.subject);
      const odds = typeof future.american_odds === 'number'
        ? americanOddsToFractional(future.american_odds)
        : null;

      if (!teamId || !odds) continue;

      const priority = futuresPriority(future);
      const existing = titleOddsByTeam.get(teamId);

      if (!existing || priority < existing.priority) {
        titleOddsByTeam.set(teamId, { odds, priority });
      }
    }

    if (titleOddsByTeam.size > 0) {
      const { data: dbTeams, error: dbTeamsError } = await supabaseAdmin
        .from('teams')
        .select('id, edited_by_admin');
      if (dbTeamsError) throw dbTeamsError;

      const teamOddsRows = (dbTeams ?? [])
        .filter((team: { id: string; edited_by_admin: boolean }) => !team.edited_by_admin)
        .map((team: { id: string; edited_by_admin: boolean }) => {
          const titleOdds = titleOddsByTeam.get(team.id)?.odds;
          if (!titleOdds) return null;
          return {
            id: team.id,
            title_odds: titleOdds,
            source: SOURCE,
            updated_at: syncedAt,
          };
        })
        .filter((row: { id: string; title_odds: string; source: string; updated_at: string } | null): row is {
          id: string;
          title_odds: string;
          source: string;
          updated_at: string;
        } => row !== null);

      if (teamOddsRows.length > 0) {
        let oddsUpdated = 0;

        for (const row of teamOddsRows) {
          const { error } = await supabaseAdmin
            .from('teams')
            .update({
              title_odds: row.title_odds,
              source: row.source,
              updated_at: row.updated_at,
            })
            .eq('id', row.id)
            .eq('edited_by_admin', false);

          if (error) log.push(`WARN title odds update ${row.id}: ${error.message}`);
          else oddsUpdated++;
        }

        log.push(`Updated ${oddsUpdated} team title odds`);
      } else {
        log.push('No matching non-admin team title odds to update');
      }
    } else {
      log.push('No title odds returned from futures endpoint');
    }

    const { data: lockedPlayers, error: lockedPlayersError } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('edited_by_admin', true);
    if (lockedPlayersError) throw lockedPlayersError;
    const lockedPlayerIds = new Set((lockedPlayers ?? []).map((row: { id: string }) => row.id));

    log.push('Fetching BALLDONTLIE FIFA rosters...');
    await sleep(REQUEST_PAUSE_MS);
    const rosters = await bdFetchAll<BDRoster>(`/rosters?seasons[]=${SEASON}`, log);
    const playerRows = new Map<string, PlayerRow>();

    for (const roster of rosters) {
      const teamId = bdlTeamToOurs.get(roster.team_id);
      if (!teamId) continue;

      const row = playerRow(teamId, roster.player, syncedAt, roster.position);
      if (!lockedPlayerIds.has(row.id)) playerRows.set(row.id, row);
    }

    if (playerRows.size > 0) {
      const { error } = await supabaseAdmin
        .from('players')
        .upsert([...playerRows.values()], { onConflict: 'id' });
      if (error) log.push(`WARN players upsert: ${error.message}`);
      else log.push(`Upserted ${playerRows.size} roster players`);
    } else {
      log.push('No roster players upserted');
    }

    log.push('Fetching DB fixtures...');
    const { data: dbFixtures, error: fixturesError } = await supabaseAdmin
      .from('fixtures')
      .select('id, home_team_id, away_team_id, status, edited_by_admin');
    if (fixturesError) throw fixturesError;

    const fixtureById = new Map<string, DbFixture>();
    const fixtureByPair = new Map<string, DbFixture>();
    for (const fixture of (dbFixtures ?? []) as DbFixture[]) {
      fixtureById.set(fixture.id, fixture);
      fixtureByPair.set(matchKey(fixture.home_team_id, fixture.away_team_id), fixture);
    }

    log.push('Fetching BALLDONTLIE FIFA matches...');
    await sleep(REQUEST_PAUSE_MS);
    const matches = await bdFetchAll<BDMatch>(`/matches?seasons[]=${SEASON}`, log);
    const bdlMatchToFixture = new Map<number, DbFixture>();
    const fixtureUpdates: Array<{
      id: string;
      status: 'scheduled' | 'live' | 'finished';
      minute: number | null;
      home_score: number | null;
      away_score: number | null;
      source: string;
      updated_at: string;
    }> = [];

    for (const match of matches) {
      const fixture = fixtureForMatch(match, fixtureById, fixtureByPair);
      if (!fixture) continue;

      bdlMatchToFixture.set(match.id, fixture);
      if (fixture.edited_by_admin) continue;

      fixtureUpdates.push({
        id: fixture.id,
        status: mapMatchStatus(match.status),
        minute: match.status === 'in_progress' ? null : null,
        home_score: match.home_score,
        away_score: match.away_score,
        source: SOURCE,
        updated_at: syncedAt,
      });
    }

    if (fixtureUpdates.length > 0) {
      const { error } = await supabaseAdmin
        .from('fixtures')
        .upsert(fixtureUpdates, { onConflict: 'id' });
      if (error) log.push(`WARN fixture upsert: ${error.message}`);
      else log.push(`Updated ${fixtureUpdates.length} fixture score/status rows`);
    }

    const eventMatchIds = matches
      .filter(match => ['in_progress', 'completed'].includes(match.status))
      .filter(match => bdlMatchToFixture.has(match.id))
      .map(match => match.id);

    let eventsUpserted = 0;
    for (let i = 0; i < eventMatchIds.length; i += EVENT_MATCH_BATCH_SIZE) {
      const batch = eventMatchIds.slice(i, i + EVENT_MATCH_BATCH_SIZE);
      if (batch.length === 0) continue;

      await sleep(REQUEST_PAUSE_MS);
      const eventsPath = appendArrayParam('/match_events', 'match_ids', batch);
      const bdlEvents = await bdFetchAll<BDEvent>(eventsPath, log);
      const eventRows: EventRow[] = [];
      const eventPlayers = new Map<string, PlayerRow>();
      const fixtureIdsInBatch = new Set<string>();

      for (const event of bdlEvents) {
        const fixture = bdlMatchToFixture.get(event.match_id);
        if (!fixture || fixture.edited_by_admin) continue;

        const mapped = eventToRow(event, fixture, syncedAt);
        if (!mapped) continue;

        eventRows.push(mapped.row);
        fixtureIdsInBatch.add(fixture.id);
        for (const player of mapped.players) {
          if (!lockedPlayerIds.has(player.id)) eventPlayers.set(player.id, player);
        }
      }

      if (eventPlayers.size > 0) {
        const { error } = await supabaseAdmin
          .from('players')
          .upsert([...eventPlayers.values()], { onConflict: 'id' });
        if (error) log.push(`WARN event-player upsert: ${error.message}`);
      }

      for (const fixtureId of fixtureIdsInBatch) {
        const { error } = await supabaseAdmin.from('match_events').delete().eq('fixture_id', fixtureId);
        if (error) log.push(`WARN delete events ${fixtureId}: ${error.message}`);
      }

      if (eventRows.length > 0) {
        const { error } = await supabaseAdmin
          .from('match_events')
          .upsert(eventRows, { onConflict: 'id' });
        if (error) log.push(`WARN event upsert: ${error.message}`);
        else eventsUpserted += eventRows.length;
      }
    }

    log.push(`Upserted ${eventsUpserted} real match events`);

    return new Response(
      JSON.stringify({ ok: true, log }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    log.push(`ERROR: ${err}`);
    console.error('[sync-balldontlie]', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err), log }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
