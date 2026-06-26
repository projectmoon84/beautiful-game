import type {
  Team, Player, Group, Venue, Fixture, MatchEvent,
  GroupTableRow, QualificationStatus, PlayerStat, InsightCard,
  FormResult, Position, Stage, FixtureStatus, EventType,
  MatchLineup, LineupSlot, MatchTeamStats,
} from './types';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  DEV_MOCK_EVENTS,
  DEV_MOCK_FIXTURES,
  DEV_MOCK_GROUPS,
  DEV_MOCK_INSIGHTS,
  DEV_MOCK_PLAYERS,
  DEV_MOCK_TEAMS,
  DEV_MOCK_VENUES,
} from './devMockData';

type DataSourceMode = 'auto' | 'supabase' | 'mock';
const ENGLAND_FLAG = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';

const requestedDataSource = ((import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? 'auto') as DataSourceMode;
const canUseMockData = !import.meta.env.PROD || import.meta.env.VITE_ALLOW_MOCK_DATA === 'true';
const mockAllowedInThisBuild =
  canUseMockData &&
  (requestedDataSource === 'mock' || requestedDataSource === 'auto');
const SUPABASE_LOAD_TIMEOUT_MS = 15_000;

// ── Module-level caches ───────────────────────────────────────────
// Production starts empty and fills only from Supabase. Local dev can opt into
// the generated day-10 tournament mock via VITE_DATA_SOURCE=mock.

let teamCache = new Map<string, Team>();
let groupCache = new Map<string, Group>();
let venueCache = new Map<string, Venue>();
let playerCache = new Map<string, Player>();
let fixtureCache: Fixture[] = [];
let eventCache: MatchEvent[] = [];
let insightCache: InsightCard[] = [];
let standingsCache = new Map<string, GroupTableRow[]>();
let playerStatCache: PlayerStat[] = [];
// Keyed by `${fixtureId}:${teamId}`
let lineupCache = new Map<string, MatchLineup>();
let teamStatsCache = new Map<string, MatchTeamStats>();

type FixtureRow = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  venue_id: string;
  group_id: string | null;
  kickoff_utc: string;
  stage: string;
  status: string;
  minute: number | null;
  home_score: number | null;
  away_score: number | null;
  man_of_match_player_id: string | null;
};

type PlayerRow = {
  id: string;
  team_id: string;
  name: string;
  shirt_number: number;
  position: string;
  date_of_birth?: string | null;
};

type MatchEventRow = {
  id: string;
  fixture_id: string;
  minute: number;
  type: string;
  team_id: string;
  player_id: string;
  assist_player_id: string | null;
  player?: { name: string | null } | null;
  assist_player?: { name: string | null } | null;
};

const MATCH_EVENT_SELECT = `
  *,
  player:players!match_events_player_id_fkey(name),
  assist_player:players!match_events_assist_player_id_fkey(name)
`;

type MatchLineupRow = {
  fixture_id: string;
  team_id: string;
  player_id: string;
  player_name: string;
  shirt_number: number;
  position: string;
  is_starter: boolean;
  formation: string | null;
  subbed_off_minute: number | null;
  subbed_on_minute: number | null;
  subbed_for_player_id: string | null;
};

type MatchTeamStatsRow = {
  fixture_id: string;
  team_id: string;
  possession_pct: number | null;
  shots_on_target: number | null;
  shots_off_target: number | null;
  shots_blocked: number | null;
  corners: number | null;
  offsides: number | null;
  fouls: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
};

function mapLineupRow(row: MatchLineupRow): LineupSlot {
  return {
    playerId: row.player_id,
    playerName: row.player_name,
    shirtNumber: row.shirt_number,
    position: row.position as Position,
    isStarter: row.is_starter,
    ...(row.subbed_off_minute !== null && { subbedOffMinute: row.subbed_off_minute }),
    ...(row.subbed_on_minute !== null && { subbedOnMinute: row.subbed_on_minute }),
    ...(row.subbed_for_player_id !== null && { subbedForPlayerId: row.subbed_for_player_id }),
  };
}

function mapTeamStatsRow(row: MatchTeamStatsRow): MatchTeamStats {
  return {
    fixtureId: row.fixture_id,
    teamId: row.team_id,
    ...(row.possession_pct !== null && { possessionPct: row.possession_pct }),
    ...(row.shots_on_target !== null && { shotsOnTarget: row.shots_on_target }),
    ...(row.shots_off_target !== null && { shotsOffTarget: row.shots_off_target }),
    ...(row.shots_blocked !== null && { shotsBlocked: row.shots_blocked }),
    ...(row.corners !== null && { corners: row.corners }),
    ...(row.offsides !== null && { offsides: row.offsides }),
    ...(row.fouls !== null && { fouls: row.fouls }),
    ...(row.yellow_cards !== null && { yellowCards: row.yellow_cards }),
    ...(row.red_cards !== null && { redCards: row.red_cards }),
  };
}

function mapFixtureRow(row: FixtureRow): Fixture {
  return {
    id:                  row.id,
    homeTeamId:          row.home_team_id ?? '',
    awayTeamId:          row.away_team_id ?? '',
    homePlaceholder:     row.home_placeholder ?? undefined,
    awayPlaceholder:     row.away_placeholder ?? undefined,
    venueId:             row.venue_id,
    groupId:             row.group_id ?? '',
    kickoffUtc:          row.kickoff_utc,
    stage:               row.stage as Stage,
    status:              row.status as FixtureStatus,
    minute:              row.minute              ?? undefined,
    homeScore:           row.home_score          ?? undefined,
    awayScore:           row.away_score          ?? undefined,
    manOfMatchPlayerId:  row.man_of_match_player_id ?? undefined,
  };
}

function mapPlayerRow(row: PlayerRow): Player {
  return {
    id:          row.id,
    teamId:      row.team_id,
    name:        row.name,
    shirtNumber: row.shirt_number,
    position:    row.position as Position,
    dateOfBirth: row.date_of_birth ?? undefined,
  };
}

function mapEventRow(row: MatchEventRow): MatchEvent {
  return {
    id:              row.id,
    fixtureId:       row.fixture_id,
    minute:          row.minute,
    type:            row.type as EventType,
    teamId:          row.team_id,
    playerId:        row.player_id,
    assistPlayerId:  row.assist_player_id ?? undefined,
    playerName:      row.player?.name ?? undefined,
    assistPlayerName: row.assist_player?.name ?? undefined,
  };
}

// ── Group standings tiebreakers ───────────────────────────────────
// FIFA WC 2026 Art. 12 ranking criteria within a group:
//   1 pts  2 overall GD  3 overall GF
//   4 H2H pts  5 H2H GD  6 H2H GF  (only among teams still tied after 1–3)
//   7 fair play (not implemented — card data not stored per group)
//   8 drawing of lots
//
// For ranking 12 third-place teams: pts → GD → GF → GA (no H2H, different groups).

const GROUP_FIXTURE_COUNT = 6;

function allGroupsComplete(): boolean {
  if (groupCache.size === 0) return false;
  for (const group of groupCache.values()) {
    const finished = fixtureCache.filter(f => f.groupId === group.id && f.status === 'finished').length;
    if (finished < GROUP_FIXTURE_COUNT) return false;
  }
  return true;
}

interface H2HStats { points: number; goalDiff: number; goalsFor: number }

// Build a mini H2H table for a set of teams using only finished fixtures between them.
function h2hAmong(teamIds: Set<string>, groupId: string): Map<string, H2HStats> {
  const stats = new Map<string, H2HStats>();
  for (const id of teamIds) stats.set(id, { points: 0, goalDiff: 0, goalsFor: 0 });

  for (const f of fixtureCache) {
    if (f.groupId !== groupId || f.status !== 'finished') continue;
    if (!teamIds.has(f.homeTeamId) || !teamIds.has(f.awayTeamId)) continue;

    const hs = f.homeScore ?? 0;
    const as_ = f.awayScore ?? 0;

    const home = stats.get(f.homeTeamId)!;
    home.goalsFor += hs;
    home.goalDiff += hs - as_;
    if (hs > as_) home.points += 3; else if (hs === as_) home.points += 1;

    const away = stats.get(f.awayTeamId)!;
    away.goalsFor += as_;
    away.goalDiff += as_ - hs;
    if (as_ > hs) away.points += 3; else if (as_ === hs) away.points += 1;
  }

  return stats;
}

// Resolve teams already known to be equal on pts + overall GD + overall GF.
// Applies H2H pts → H2H GD → H2H GF among the tied set. If a strict sub-group
// emerges but some teams remain tied, restarts H2H for just that sub-group (FIFA rule).
function resolveTied(tied: GroupTableRow[], groupId: string): GroupTableRow[] {
  if (tied.length === 1) return tied;

  const teamIds = new Set(tied.map(r => r.team.id));
  const h2h = h2hAmong(teamIds, groupId);

  const sorted = [...tied].sort((a, b) => {
    const ah = h2h.get(a.team.id)!;
    const bh = h2h.get(b.team.id)!;
    return bh.points - ah.points || bh.goalDiff - ah.goalDiff || bh.goalsFor - ah.goalsFor;
  });

  const result: GroupTableRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    const pivot = h2h.get(sorted[i].team.id)!;
    const sub = [sorted[i]];
    while (
      i + sub.length < sorted.length &&
      h2h.get(sorted[i + sub.length].team.id)!.points   === pivot.points &&
      h2h.get(sorted[i + sub.length].team.id)!.goalDiff === pivot.goalDiff &&
      h2h.get(sorted[i + sub.length].team.id)!.goalsFor === pivot.goalsFor
    ) {
      sub.push(sorted[i + sub.length]);
    }

    // Recurse only when the sub-group is smaller (otherwise we'd loop forever).
    result.push(...(sub.length < tied.length ? resolveTied(sub, groupId) : sub));
    i += sub.length;
  }

  return result;
}

// Full FIFA WC 2026 group sort: pts → GD → GF → H2H (among still-tied teams).
function sortWithTiebreakers(rows: GroupTableRow[], groupId: string): GroupTableRow[] {
  if (rows.length <= 1) return rows;

  // Group by points (criterion 1).
  const byPts = new Map<number, GroupTableRow[]>();
  for (const row of rows) {
    const g = byPts.get(row.points) ?? [];
    g.push(row);
    byPts.set(row.points, g);
  }

  return [...byPts.keys()].sort((a, b) => b - a).flatMap(pts => {
    const group = byPts.get(pts)!;
    if (group.length === 1) return group;

    // Sort by overall GD then GF (criteria 2–3).
    const byOverall = [...group].sort((a, b) => b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);

    // Within each same-GD+GF sub-group, apply H2H (criteria 4–6).
    const result: GroupTableRow[] = [];
    let i = 0;
    while (i < byOverall.length) {
      const pivot = byOverall[i];
      const sub = [pivot];
      while (
        i + sub.length < byOverall.length &&
        byOverall[i + sub.length].goalDiff === pivot.goalDiff &&
        byOverall[i + sub.length].goalsFor  === pivot.goalsFor
      ) {
        sub.push(byOverall[i + sub.length]);
      }
      result.push(...(sub.length === 1 ? sub : resolveTied(sub, groupId)));
      i += sub.length;
    }

    return result;
  });
}

// Rank 12 third-place teams: pts → GD → GF → GA (no H2H — different groups).
// Fair play is criterion 4 per FIFA regulations but requires per-group card data
// we don't store; GA is used as a reasonable programmatic fallback before lots.
function computeQualified3rdIds(): Set<string> {
  const thirds: GroupTableRow[] = [];
  for (const group of groupCache.values()) {
    const cached = standingsCache.get(group.id);
    if (!cached || cached.length < 3) continue;
    // Apply tiebreakers so we get the actual 3rd-place team, not the basic-sorted one.
    const sorted = sortWithTiebreakers(cached, group.id);
    thirds.push(sorted[2]);
  }
  thirds.sort((a, b) =>
    b.points    - a.points    ||
    b.goalDiff  - a.goalDiff  ||
    b.goalsFor  - a.goalsFor  ||
    a.goalsAgainst - b.goalsAgainst
  );
  return new Set(thirds.slice(0, 8).map(r => r.team.id));
}

// Applied at read-time so isLive always reflects the current fixture state.
function addGroupStatuses(rows: GroupTableRow[], groupId: string): GroupTableRow[] {
  const groupFixtures = fixtureCache.filter(f => f.groupId === groupId && f.stage === 'group');
  const liveTeamIds = new Set(
    groupFixtures
      .filter(f => f.status === 'live')
      .flatMap(f => [f.homeTeamId, f.awayTeamId]),
  );
  const allFinished = groupFixtures.filter(f => f.status === 'finished').length === GROUP_FIXTURE_COUNT;
  const qualified3rdIds = allFinished && allGroupsComplete() ? computeQualified3rdIds() : new Set<string>();

  return rows.map((row, idx) => {
    const pos = idx + 1;
    let qualificationStatus: QualificationStatus = null;
    if (allFinished) {
      if (pos <= 2) {
        qualificationStatus = 'qualified';
      } else if (pos === 3) {
        qualificationStatus = qualified3rdIds.size > 0
          ? (qualified3rdIds.has(row.team.id) ? 'qualified' : 'eliminated')
          : 'pending_third';
      } else {
        qualificationStatus = 'eliminated';
      }
    }
    return { ...row, isLive: liveTeamIds.has(row.team.id), qualificationStatus };
  });
}

function loadMockData(): void {
  teamCache = new Map<string, Team>(DEV_MOCK_TEAMS.map(t => [t.id, t]));
  groupCache = new Map<string, Group>(DEV_MOCK_GROUPS.map(g => [g.id, g]));
  venueCache = new Map<string, Venue>(DEV_MOCK_VENUES.map(v => [v.id, v]));
  playerCache = new Map<string, Player>(DEV_MOCK_PLAYERS.map(p => [p.id, p]));
  fixtureCache = [...DEV_MOCK_FIXTURES];
  eventCache = [...DEV_MOCK_EVENTS];
  insightCache = [...DEV_MOCK_INSIGHTS];
  standingsCache = new Map();
  playerStatCache = [];
}

// ── Supabase loader ───────────────────────────────────────────────

async function loadFromSupabase(): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialised');
  standingsCache = new Map();
  playerStatCache = [];

  const [
    { data: groupsData,      error: e1 },
    { data: venuesData,      error: e2 },
    { data: teamsData,       error: e3 },
    { data: playersPage1,    error: e4a },
    { data: playersPage2,    error: e4b },
    { data: fixturesData,    error: e5 },
    { data: eventsData,      error: e6 },
    { data: insightsData,    error: e7 },
    { data: standingsData,   error: e8 },
    { data: playerStatsData, error: e9 },
  ] = await Promise.all([
    supabase.from('groups').select('*'),
    supabase.from('venues').select('*'),
    supabase.from('teams').select('*'),
    supabase.from('players').select('*').range(0, 999),
    supabase.from('players').select('*').range(1000, 2999),
    supabase.from('fixtures').select('*').order('kickoff_utc'),
    supabase.from('match_events').select(MATCH_EVENT_SELECT).order('minute'),
    supabase.from('insights').select('*').eq('is_published', true),
    supabase.from('standings').select('*'),
    supabase.from('player_stats').select('*'),
  ]);

  const playersData = [...(playersPage1 ?? []), ...(playersPage2 ?? [])];

  if (e1 || e2 || e3 || e4a || e4b || e5 || e6 || e7 || e8 || e9) {
    throw new Error('Supabase fetch failed');
  }

  if (teamsData) {
    const realTeamRows = teamsData.filter(row => row.fifa_code);
    const visibleTeamRows = realTeamRows.length > 0 ? realTeamRows : teamsData;

    teamCache = new Map(visibleTeamRows.map(row => [row.id, {
      id:           row.id,
      name:         row.name,
      shortCode:    row.short_code,
      flagEmoji:    row.id === 'ENG' ? ENGLAND_FLAG : row.flag_emoji,
      groupId:      row.group_id,
      seed:         row.seed,
      titleOdds:    row.title_odds,
      primaryHex:   row.primary_hex,
      secondaryHex: row.secondary_hex,
      tertiaryHex:  row.tertiary_hex,
      onPrimary:    row.on_primary    ?? undefined,
      onSecondary:  row.on_secondary  ?? undefined,
      funFact:      row.fun_fact,
      triviaFacts:  (row.trivia_facts ?? []) as string[],
      form:         (row.form ?? []) as FormResult[],
    }]));
    console.info(`[dataService] Loaded ${teamCache.size} teams from Supabase`);
  }

  if (groupsData && teamsData) {
    const visibleTeamIds = new Set(teamCache.keys());
    const groups: Array<[string, Group]> = groupsData.map(row => {
      const group: Group = {
        id:      row.id,
        label:   row.label,
        teamIds: teamsData
          .filter(t => t.group_id === row.id && visibleTeamIds.has(t.id))
          .map(t => t.id),
      };
      return [row.id, group];
    });
    groupCache = new Map(groups.filter(([, group]) => group.teamIds.length > 0));
  }

  if (standingsData) {
    const visibleTeamIds = new Set(teamCache.keys());
    const groupedStandings = new Map<string, GroupTableRow[]>();

    for (const row of standingsData) {
      if (!row.team_id || !row.group_id || !visibleTeamIds.has(row.team_id)) continue;

      const team = teamCache.get(row.team_id);
      if (!team) continue;

      const groupRows = groupedStandings.get(row.group_id) ?? [];
      groupRows.push({
        team,
        played:              row.played        ?? 0,
        won:                 row.won           ?? 0,
        drawn:               row.drawn         ?? 0,
        lost:                row.lost          ?? 0,
        goalsFor:            row.goals_for     ?? 0,
        goalsAgainst:        row.goals_against ?? 0,
        goalDiff:            row.goal_diff     ?? 0,
        points:              row.points        ?? 0,
        isLive:              false,
        qualificationStatus: null,
      });
      groupedStandings.set(row.group_id, groupRows);
    }

    for (const [groupId, rows] of groupedStandings) {
      standingsCache.set(groupId, rows.sort(
        (a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor
      ));
    }
  }

  if (venuesData) {
    venueCache = new Map(venuesData.map(row => [row.id, {
      id:      row.id,
      stadium: row.stadium,
      city:    row.city,
      country: row.country,
      funFact: row.fun_fact,
    }]));
  }

  if (playersData) {
    const visibleTeamIds = new Set(teamCache.keys());
    playerCache = new Map(playersData
      .filter(row => visibleTeamIds.has(row.team_id))
      .map(row => [row.id, mapPlayerRow(row)]));
  }

  if (playerStatsData) {
    const visibleTeamIds = new Set(teamCache.keys());
    playerStatCache = playerStatsData
      .filter(row => row.player_id && row.player_name && row.team_id && visibleTeamIds.has(row.team_id))
      .map(row => ({
        playerId:    row.player_id!,
        playerName:  row.player_name!,
        teamId:      row.team_id!,
        goals:       row.goals        ?? 0,
        assists:     row.assists      ?? 0,
        yellowCards: row.yellow_cards ?? 0,
        redCards:    row.red_cards    ?? 0,
      }))
      .sort((a, b) => (
        b.goals - a.goals ||
        b.assists - a.assists ||
        (b.yellowCards + b.redCards) - (a.yellowCards + a.redCards) ||
        a.playerName.localeCompare(b.playerName)
      ));
  }

  if (fixturesData) {
    const visibleTeamIds = new Set(teamCache.keys());
    const hasRealFeedFixtures = fixturesData.some(row => row.id.startsWith('OF-'));
    fixtureCache = fixturesData
      .filter(row => (
        // Keep knockout fixtures even when teams are TBD (null); group fixtures need both teams
        (row.stage === 'group'
          ? visibleTeamIds.has(row.home_team_id) && visibleTeamIds.has(row.away_team_id)
          : true) &&
        (!hasRealFeedFixtures || row.id.startsWith('OF-'))
      ))
      .map(mapFixtureRow);
  }

  if (eventsData) {
    const visibleFixtureIds = new Set(fixtureCache.map(f => f.id));
    eventCache = (eventsData as unknown as MatchEventRow[])
      .filter(row => visibleFixtureIds.has(row.fixture_id))
      .map(mapEventRow);
  }

  if (insightsData) {
    insightCache = insightsData.map(row => ({
      kind:   row.kind,
      teamId: row.team_id ?? '',
      value:  row.value,
      blurb:  row.blurb,
    }));
  }
}

// ── Public API ────────────────────────────────────────────────────

export const dataService = {

  async init(): Promise<void> {
    if (requestedDataSource === 'mock') {
      if (mockAllowedInThisBuild) {
        loadMockData();
      } else {
        console.error('[dataService] Mock data requested, but this build does not allow mock data');
      }
      return;
    }

    if (!isSupabaseConfigured) {
      if (mockAllowedInThisBuild) loadMockData();
      return;
    }

    try {
      await Promise.race([
        loadFromSupabase(),
        new Promise((_, reject) => {
          globalThis.setTimeout(() => reject(new Error('Supabase fetch timed out')), SUPABASE_LOAD_TIMEOUT_MS);
        }),
      ]);
    } catch (err) {
      if (mockAllowedInThisBuild) {
        console.warn('[dataService] Supabase unavailable, using local mock data', err);
        loadMockData();
        return;
      }
      console.error('[dataService] Supabase unavailable and mock data is disabled', err);
    }
  },

  sourceMode(): DataSourceMode { return requestedDataSource; },

  isUsingMockData(): boolean {
    return fixtureCache.some(fixture => fixture.id.startsWith('DEV-'));
  },

  // ── Core lookups ──────────────────────────────────────────────

  team(id: string): Team | undefined { return teamCache.get(id); },

  allTeams(): Team[] { return [...teamCache.values()]; },

  group(id: string): Group | undefined { return groupCache.get(id); },

  allGroups(): Group[] { return [...groupCache.values()]; },

  venue(id: string): Venue | undefined { return venueCache.get(id); },

  player(id: string): Player | undefined { return playerCache.get(id); },

  squad(teamId: string): Player[] {
    const all = [...playerCache.values()].filter(p => p.teamId === teamId);
    // ESPN event players use IDs like "MEX-ESPN-12345" and are only for event attribution.
    // Prefer the official openfootball squad when it exists.
    const official = all.filter(p => !p.id.includes('-ESPN-'));
    return official.length > 0 ? official : all;
  },

  allFixtures(): Fixture[] { return fixtureCache; },

  fixture(id: string): Fixture | undefined {
    return fixtureCache.find(f => f.id === id);
  },

  fixturesByDate(): Map<string, Fixture[]> {
    const map = new Map<string, Fixture[]>();
    for (const f of fixtureCache) {
      const day = f.kickoffUtc.slice(0, 10);
      const existing = map.get(day) ?? [];
      map.set(day, [...existing, f]);
    }
    return map;
  },

  teamFixtures(teamId: string): Fixture[] {
    return fixtureCache.filter(f => f.homeTeamId === teamId || f.awayTeamId === teamId);
  },

  matchEvents(fixtureId: string): MatchEvent[] {
    return eventCache
      .filter(e => e.fixtureId === fixtureId)
      .sort((a, b) => a.minute - b.minute);
  },

  matchLineup(fixtureId: string, teamId: string): MatchLineup | null {
    const key = `${fixtureId}:${teamId}`;
    return lineupCache.get(key) ?? null;
  },

  matchTeamStats(fixtureId: string, teamId: string): MatchTeamStats | null {
    const key = `${fixtureId}:${teamId}`;
    return teamStatsCache.get(key) ?? null;
  },

  async refreshMatch(fixtureId: string): Promise<boolean> {
    if (!supabase || !isSupabaseConfigured) return false;

    const [
      { data: fixtureData, error: fixtureError },
      { data: eventsData, error: eventsError },
      { data: lineupData, error: lineupError },
      { data: statsData, error: statsError },
    ] = await Promise.all([
      supabase.from('fixtures').select('*').eq('id', fixtureId).maybeSingle(),
      supabase.from('match_events').select(MATCH_EVENT_SELECT).eq('fixture_id', fixtureId).order('minute'),
      supabase.from('match_lineups').select('*').eq('fixture_id', fixtureId),
      supabase.from('match_team_stats').select('*').eq('fixture_id', fixtureId),
    ]);

    if (fixtureError || eventsError || !fixtureData) {
      console.warn('[dataService] Match refresh failed', fixtureError ?? eventsError);
      return false;
    }
    if (lineupError) console.warn('[dataService] Lineup fetch failed', lineupError);
    if (statsError) console.warn('[dataService] Stats fetch failed', statsError);

    const refreshedFixture = mapFixtureRow(fixtureData);
    fixtureCache = fixtureCache.map(fixture => fixture.id === fixtureId ? refreshedFixture : fixture);
    if (refreshedFixture.groupId) standingsCache.delete(refreshedFixture.groupId);

    const refreshedEvents = ((eventsData ?? []) as unknown as MatchEventRow[]).map(mapEventRow);
    eventCache = [
      ...eventCache.filter(event => event.fixtureId !== fixtureId),
      ...refreshedEvents,
    ];

    const playerIds = [
      ...new Set(refreshedEvents.flatMap(event => [
        event.playerId,
        event.assistPlayerId,
      ]).filter((id): id is string => Boolean(id))),
    ];

    if (playerIds.length > 0) {
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, team_id, name, shirt_number, position')
        .in('id', playerIds);

      if (playersError) {
        console.warn('[dataService] Match player refresh failed', playersError);
      } else {
        for (const player of playersData ?? []) {
          playerCache.set(player.id, mapPlayerRow(player));
        }
      }
    }

    // Hydrate lineup cache
    if (lineupData && lineupData.length > 0) {
      const byTeam = new Map<string, MatchLineupRow[]>();
      for (const row of lineupData as unknown as MatchLineupRow[]) {
        const existing = byTeam.get(row.team_id) ?? [];
        byTeam.set(row.team_id, [...existing, row]);
      }
      for (const [teamId, rows] of byTeam) {
        const formation = rows.find(r => r.is_starter && r.formation)?.formation ?? undefined;
        const lineup: MatchLineup = {
          fixtureId,
          teamId,
          formation,
          players: rows.map(r => mapLineupRow(r)),
        };
        lineupCache.set(`${fixtureId}:${teamId}`, lineup);
      }
    }

    // Hydrate team stats cache
    for (const row of (statsData ?? []) as unknown as MatchTeamStatsRow[]) {
      teamStatsCache.set(`${fixtureId}:${row.team_id}`, mapTeamStatsRow(row));
    }

    return true;
  },

  // ── Derived: standings (mirrors the SQL standings view) ───────

  standingsForGroup(groupId: string): GroupTableRow[] {
    // Statuses are always computed fresh at read-time so isLive stays current.
    // Full tiebreakers (pts → GD → GF → H2H) applied here using fixtureCache,
    // which is guaranteed to be populated by the time callers read standings.
    const cachedRows = standingsCache.get(groupId);
    if (cachedRows) return addGroupStatuses(sortWithTiebreakers(cachedRows, groupId), groupId);

    const group = groupCache.get(groupId);
    if (!group) return [];

    const rows = new Map<string, GroupTableRow>();
    for (const teamId of group.teamIds) {
      const team = teamCache.get(teamId);
      if (!team) continue;
      rows.set(teamId, { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0, isLive: false, qualificationStatus: null });
    }

    for (const f of fixtureCache) {
      if (f.groupId !== groupId || (f.status !== 'finished' && f.status !== 'live')) continue;
      const hs = f.homeScore ?? 0;
      const as_ = f.awayScore ?? 0;

      const home = rows.get(f.homeTeamId);
      if (home) {
        home.played++;
        home.goalsFor += hs; home.goalsAgainst += as_;
        if (hs > as_) { home.won++; home.points += 3; }
        else if (hs === as_) { home.drawn++; home.points += 1; }
        else home.lost++;
      }

      const away = rows.get(f.awayTeamId);
      if (away) {
        away.played++;
        away.goalsFor += as_; away.goalsAgainst += hs;
        if (as_ > hs) { away.won++; away.points += 3; }
        else if (as_ === hs) { away.drawn++; away.points += 1; }
        else away.lost++;
      }
    }

    for (const row of rows.values()) row.goalDiff = row.goalsFor - row.goalsAgainst;

    return addGroupStatuses(sortWithTiebreakers([...rows.values()], groupId), groupId);
  },

  // ── Derived: player stats (mirrors the SQL player_stats view) ─

  playerStats(): PlayerStat[] {
    if (playerStatCache.length > 0) return playerStatCache;

    const stats = new Map<string, PlayerStat>();

    for (const e of eventCache) {
      const player = playerCache.get(e.playerId);
      if (!player) continue;

      if (!stats.has(e.playerId)) {
        stats.set(e.playerId, {
          playerId: e.playerId, playerName: player.name, teamId: player.teamId,
          goals: 0, assists: 0, yellowCards: 0, redCards: 0,
        });
      }
      const s = stats.get(e.playerId)!;
      if (e.type === 'goal' || e.type === 'penalty') s.goals++;
      if (e.type === 'yellow') s.yellowCards++;
      if (e.type === 'red') s.redCards++;

      if (e.assistPlayerId) {
        const ap = playerCache.get(e.assistPlayerId);
        if (ap) {
          if (!stats.has(e.assistPlayerId)) {
            stats.set(e.assistPlayerId, {
              playerId: e.assistPlayerId, playerName: ap.name, teamId: ap.teamId,
              goals: 0, assists: 0, yellowCards: 0, redCards: 0,
            });
          }
          stats.get(e.assistPlayerId)!.assists++;
        }
      }
    }

    return [...stats.values()].sort(
      (a, b) => b.goals - a.goals || b.assists - a.assists
    );
  },

  // ── Editorial insights ────────────────────────────────────────

  insights(): InsightCard[] { return insightCache; },
};
