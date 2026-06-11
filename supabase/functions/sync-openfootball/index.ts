/**
 * sync-openfootball
 *
 * Imports the current 2026 World Cup spine from openfootball:
 * - worldcup.teams.json    -> groups + teams
 * - worldcup.stadiums.json -> venues
 * - worldcup.json          -> group-stage fixtures/results
 * - worldcup.squads.json   -> squads
 *
 * Rows with edited_by_admin = true are never overwritten.
 *
 * Deploy:   supabase functions deploy sync-openfootball
 * Schedule: Supabase dashboard -> Edge Functions -> Schedule -> "0 * * * *"
 * Manual:   curl -X POST $SUPABASE_URL/functions/v1/sync-openfootball \
 *             -H "Authorization: Bearer $SUPABASE_ANON_KEY"
 */

import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const BASE_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026';
const SCHEDULE_URL = `${BASE_URL}/worldcup.json`;
const TEAMS_URL = `${BASE_URL}/worldcup.teams.json`;
const STADIUMS_URL = `${BASE_URL}/worldcup.stadiums.json`;
const SQUADS_URL = `${BASE_URL}/worldcup.squads.json`;
const SOURCE = 'openfootball';

const COUNTRY_BY_CC: Record<string, string> = {
  ca: 'Canada',
  mx: 'Mexico',
  us: 'USA',
};

const TEAM_COLOURS: Record<string, Pick<TeamRow, 'primary_hex' | 'secondary_hex' | 'tertiary_hex'>> = {
  ARG: { primary_hex: '#75AADB', secondary_hex: '#FFFFFF', tertiary_hex: '#F6B40E' },
  AUS: { primary_hex: '#0057B8', secondary_hex: '#FFCD00', tertiary_hex: '#00843D' },
  BEL: { primary_hex: '#000000', secondary_hex: '#FFD700', tertiary_hex: '#EF3340' },
  BRA: { primary_hex: '#009739', secondary_hex: '#F5C800', tertiary_hex: '#002776' },
  CAN: { primary_hex: '#FF0000', secondary_hex: '#FFFFFF', tertiary_hex: '#FF0000' },
  CRO: { primary_hex: '#003087', secondary_hex: '#FFFFFF', tertiary_hex: '#EF3340' },
  ENG: { primary_hex: '#FFFFFF', secondary_hex: '#CE1124', tertiary_hex: '#001489' },
  ESP: { primary_hex: '#C60B1E', secondary_hex: '#FFC400', tertiary_hex: '#FFC400' },
  FRA: { primary_hex: '#001E96', secondary_hex: '#FFFFFF', tertiary_hex: '#EE2436' },
  GER: { primary_hex: '#000000', secondary_hex: '#FFFFFF', tertiary_hex: '#FFCE00' },
  JPN: { primary_hex: '#BC002D', secondary_hex: '#FFFFFF', tertiary_hex: '#BC002D' },
  MAR: { primary_hex: '#C1272D', secondary_hex: '#006233', tertiary_hex: '#C1272D' },
  MEX: { primary_hex: '#006847', secondary_hex: '#FFFFFF', tertiary_hex: '#CE1126' },
  NED: { primary_hex: '#AE1C28', secondary_hex: '#FF7900', tertiary_hex: '#21468B' },
  POR: { primary_hex: '#DA291C', secondary_hex: '#006600', tertiary_hex: '#FFD100' },
  SEN: { primary_hex: '#00853F', secondary_hex: '#FDEF42', tertiary_hex: '#EF3340' },
  URU: { primary_hex: '#5FB4E8', secondary_hex: '#FFFFFF', tertiary_hex: '#001A40' },
  USA: { primary_hex: '#3C3B6E', secondary_hex: '#FFFFFF', tertiary_hex: '#B22234' },
};

interface OFTeam {
  name: string;
  name_normalised?: string;
  flag_unicode?: string;
  fifa_code: string;
  group: string;
}

interface OFStadium {
  city: string;
  cc: string;
  name: string;
}

interface OFStadiumsJson {
  stadiums: OFStadium[];
}

interface OFMatch {
  num?: number;
  round: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
  score?: { ft?: [number, number] } | [number, number];
}

interface OFScheduleJson {
  name: string;
  matches?: OFMatch[];
  rounds?: Array<{ name: string; matches?: OFMatch[] }>;
}

interface OFSquadPlayer {
  number: number;
  pos: 'GK' | 'DF' | 'MF' | 'FW' | string;
  name: string;
  date_of_birth?: string | null;
}

interface OFSquad {
  name: string;
  fifa_code: string;
  group: string;
  players: OFSquadPlayer[];
}

interface TeamRow {
  id: string;
  name: string;
  short_code: string;
  flag_emoji: string;
  group_id: string;
  seed: number;
  title_odds: string;
  primary_hex: string;
  secondary_hex: string;
  tertiary_hex: string;
  on_primary: string | null;
  on_secondary: string | null;
  fun_fact: string;
  form: string[];
  fifa_code: string;
}

interface PlayerRow {
  id: string;
  team_id: string;
  name: string;
  shirt_number: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  date_of_birth: string | null;
  source: string;
  updated_at: string;
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function decodeFlag(value?: string): string {
  if (!value) return '';
  return value.replace(/\\u\{([0-9A-Fa-f]+)\}/g, (_, code) =>
    String.fromCodePoint(Number.parseInt(code, 16)),
  );
}

function toIsoDate(date: string, time?: string): string {
  if (!time) return `${date}T00:00:00Z`;

  const match = time.match(/^(\d{1,2}):(\d{2})(?:\s*UTC([+-]\d{1,2}))?$/);
  if (!match) return `${date}T00:00:00Z`;

  const [, hour, minute, offset] = match;
  if (!offset) return `${date}T${hour.padStart(2, '0')}:${minute}:00Z`;

  const offsetHours = Number.parseInt(offset, 10);
  const sign = offsetHours >= 0 ? '+' : '-';
  const abs = Math.abs(offsetHours).toString().padStart(2, '0');
  return new Date(`${date}T${hour.padStart(2, '0')}:${minute}:00${sign}${abs}:00`).toISOString();
}

function groupId(value?: string): string | null {
  if (!value) return null;
  return value.replace(/^Group\s+/i, '').trim();
}

function stageForRound(round: string): string {
  const lower = round.toLowerCase();
  if (lower.includes('round of 32')) return 'r32';
  if (lower.includes('round of 16')) return 'r16';
  if (lower.includes('quarter')) return 'qf';
  if (lower.includes('semi')) return 'sf';
  if (lower.includes('final')) return 'final';
  return 'group';
}

function resultFor(match: OFMatch): { status: string; home_score: number | null; away_score: number | null } {
  const score = Array.isArray(match.score) ? match.score : match.score?.ft;
  return score
    ? { status: 'finished', home_score: score[0], away_score: score[1] }
    : { status: 'scheduled', home_score: null, away_score: null };
}

function fixtureId(match: OFMatch, homeId: string, awayId: string): string {
  if (match.num) return `OF-${match.num}`;
  return `OF-${match.date}-${homeId}-${awayId}`;
}

function playerId(teamId: string, shirtNumber: number): string {
  return `${teamId}-${String(shirtNumber).padStart(2, '0')}`;
}

function playerPosition(pos: string): PlayerRow['position'] {
  if (pos === 'GK') return 'GK';
  if (pos === 'DF') return 'DEF';
  if (pos === 'MF') return 'MID';
  if (pos === 'FW') return 'FWD';
  return 'MID';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return await res.json() as T;
}

Deno.serve(async () => {
  const log: string[] = [];
  const syncedAt = new Date().toISOString();

  try {
    const [teamsJson, stadiumsJson, scheduleJson, squadsJson] = await Promise.all([
      fetchJson<OFTeam[]>(TEAMS_URL),
      fetchJson<OFStadiumsJson>(STADIUMS_URL),
      fetchJson<OFScheduleJson>(SCHEDULE_URL),
      fetchJson<OFSquad[]>(SQUADS_URL),
    ]);

    log.push(`Fetched ${teamsJson.length} teams`);
    log.push(`Fetched ${stadiumsJson.stadiums.length} stadiums`);
    log.push(`Fetched ${squadsJson.length} squads`);

    const { data: lockedTeams } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('edited_by_admin', true);
    const { data: lockedFixtures } = await supabaseAdmin
      .from('fixtures')
      .select('id')
      .eq('edited_by_admin', true);
    const { data: lockedPlayers } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('edited_by_admin', true);
    // Load current fixture states so we never downgrade a live/finished match back to scheduled.
    const { data: activeFixtures } = await supabaseAdmin
      .from('fixtures')
      .select('id, status, home_score, away_score')
      .in('status', ['live', 'finished']);

    const lockedTeamIds = new Set((lockedTeams ?? []).map((row: { id: string }) => row.id));
    const lockedFixtureIds = new Set((lockedFixtures ?? []).map((row: { id: string }) => row.id));
    const lockedPlayerIds = new Set((lockedPlayers ?? []).map((row: { id: string }) => row.id));
    type ActiveFixture = { id: string; status: string; home_score: number | null; away_score: number | null };
    const activeFixtureMap = new Map<string, ActiveFixture>(
      (activeFixtures ?? []).map((row: ActiveFixture) => [row.id, row]),
    );

    const groups = [...new Set(teamsJson.map(team => team.group))]
      .sort()
      .map(id => ({ id, label: `Group ${id}` }));

    const { error: groupError } = await supabaseAdmin
      .from('groups')
      .upsert(groups, { onConflict: 'id' });
    if (groupError) throw groupError;
    log.push(`Upserted ${groups.length} groups`);

    const stadiumRows = stadiumsJson.stadiums.map(stadium => ({
      id: `OF-V-${slug(stadium.city)}`,
      stadium: stadium.name,
      city: stadium.city,
      country: COUNTRY_BY_CC[stadium.cc] ?? stadium.cc.toUpperCase(),
      fun_fact: `${stadium.name} is one of the 2026 World Cup host venues.`,
    }));

    const { error: stadiumError } = await supabaseAdmin
      .from('venues')
      .upsert(stadiumRows, { onConflict: 'id' });
    if (stadiumError) throw stadiumError;
    log.push(`Upserted ${stadiumRows.length} venues`);

    const teamNameIndex = new Map<string, string>();
    for (const team of teamsJson) {
      teamNameIndex.set(team.name, team.fifa_code);
      if (team.name_normalised) teamNameIndex.set(team.name_normalised, team.fifa_code);
    }

    const teamRows = teamsJson
      .filter(team => !lockedTeamIds.has(team.fifa_code))
      .map((team, index): TeamRow => {
        const colours = TEAM_COLOURS[team.fifa_code] ?? {
          primary_hex: '#111111',
          secondary_hex: '#FFFFFF',
          tertiary_hex: '#D7FF47',
        };

        return {
          id: team.fifa_code,
          name: team.name,
          short_code: team.fifa_code,
          flag_emoji: decodeFlag(team.flag_unicode),
          group_id: team.group,
          seed: index + 1,
          title_odds: 'TBD',
          ...colours,
          on_primary: null,
          on_secondary: null,
          fun_fact: `${team.name} are in Group ${team.group} at the 2026 World Cup.`,
          form: [],
          fifa_code: team.fifa_code,
        };
      });

    const { error: teamError } = await supabaseAdmin
      .from('teams')
      .upsert(teamRows, { onConflict: 'id' });
    if (teamError) throw teamError;
    log.push(`Upserted ${teamRows.length} teams; skipped ${lockedTeamIds.size} admin-locked teams`);

    const playerRows = new Map<string, PlayerRow>();
    for (const squad of squadsJson) {
      if (!teamNameIndex.has(squad.name) && !teamsJson.some(team => team.fifa_code === squad.fifa_code)) {
        log.push(`WARN unresolved squad team: ${squad.name}`);
        continue;
      }

      for (const player of squad.players) {
        const id = playerId(squad.fifa_code, player.number);
        if (lockedPlayerIds.has(id)) continue;

        playerRows.set(id, {
          id,
          team_id: squad.fifa_code,
          name: player.name,
          shirt_number: player.number,
          position: playerPosition(player.pos),
          date_of_birth: player.date_of_birth ?? null,
          source: SOURCE,
          updated_at: syncedAt,
        });
      }
    }

    if (playerRows.size > 0) {
      const { error: playerError } = await supabaseAdmin
        .from('players')
        .upsert([...playerRows.values()], { onConflict: 'id' });
      if (playerError) throw playerError;
    }
    log.push(`Upserted ${playerRows.size} squad players; skipped ${lockedPlayerIds.size} admin-locked players`);

    const venueByGround = new Map(stadiumRows.map(row => [row.city, row.id]));
    const matches = scheduleJson.matches ?? scheduleJson.rounds?.flatMap(round =>
      (round.matches ?? []).map(match => ({ ...match, round: match.round ?? round.name })),
    ) ?? [];
    log.push(`Fetched ${matches.length} matches`);

    const fixtureRows = [];
    for (const match of matches) {
      const stage = stageForRound(match.round);

      const homeId = teamNameIndex.get(match.team1);
      const awayId = teamNameIndex.get(match.team2);
      const fixtureGroupId = groupId(match.group);
      const venueId = venueByGround.get(match.ground);

      // Group fixtures need both teams resolved; knockout teams may still be TBD
      if (stage === 'group' && (!homeId || !awayId || !fixtureGroupId)) {
        log.push(`WARN unresolved group fixture: ${match.team1} vs ${match.team2} at ${match.ground}`);
        continue;
      }
      if (!venueId) {
        log.push(`WARN missing venue for ${stage} fixture: ${match.team1} vs ${match.team2} at ${match.ground}`);
        continue;
      }

      // Use placeholder team name as fallback ID component for unresolved knockout teams
      const id = fixtureId(match, homeId ?? match.team1, awayId ?? match.team2);
      if (lockedFixtureIds.has(id)) continue;

      // Never downgrade a live/finished fixture — preserve ESPN-sourced status and scores.
      const active = activeFixtureMap.get(id);
      const result = active
        ? { status: active.status, home_score: active.home_score, away_score: active.away_score }
        : resultFor(match);

      fixtureRows.push({
        id,
        home_team_id: homeId ?? null,  // null until group stage determines the team
        away_team_id: awayId ?? null,
        venue_id: venueId,
        group_id: stage === 'group' ? fixtureGroupId : null,
        kickoff_utc: toIsoDate(match.date, match.time),
        stage,
        minute: null,
        man_of_match_player_id: null,
        source: SOURCE,
        updated_at: syncedAt,
        ...result,
      });
    }

    if (fixtureRows.length > 0) {
      const { error: fixtureError } = await supabaseAdmin
        .from('fixtures')
        .upsert(fixtureRows, { onConflict: 'id' });
      if (fixtureError) throw fixtureError;
    }
    log.push(`Upserted ${fixtureRows.length} fixtures across all resolved stages; skipped ${lockedFixtureIds.size} admin-locked fixtures`);

    return new Response(
      JSON.stringify({
        ok: true,
        groups: groups.length,
        teams: teamRows.length,
        players: playerRows.size,
        fixtures: fixtureRows.length,
        log,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    log.push(`ERROR: ${err}`);
    console.error('[sync-openfootball]', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err), log }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
