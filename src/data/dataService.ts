import type {
  Team, Player, Group, Venue, Fixture, MatchEvent,
  GroupTableRow, PlayerStat, InsightCard,
  FormResult, Position, Stage, FixtureStatus, EventType,
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

const requestedDataSource = ((import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? 'auto') as DataSourceMode;
const canUseMockData = !import.meta.env.PROD || import.meta.env.VITE_ALLOW_MOCK_DATA === 'true';
const mockAllowedInThisBuild =
  canUseMockData &&
  (requestedDataSource === 'mock' || requestedDataSource === 'auto');
const SUPABASE_LOAD_TIMEOUT_MS = 8_000;

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

type FixtureRow = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
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
};

type MatchEventRow = {
  id: string;
  fixture_id: string;
  minute: number;
  type: string;
  team_id: string;
  player_id: string;
  assist_player_id: string | null;
};

function mapFixtureRow(row: FixtureRow): Fixture {
  return {
    id:                  row.id,
    homeTeamId:          row.home_team_id ?? '',
    awayTeamId:          row.away_team_id ?? '',
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
  };
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
    { data: groupsData,   error: e1 },
    { data: venuesData,   error: e2 },
    { data: teamsData,    error: e3 },
    { data: playersData,  error: e4 },
    { data: fixturesData, error: e5 },
    { data: eventsData,   error: e6 },
    { data: insightsData, error: e7 },
    { data: standingsData, error: e8 },
    { data: playerStatsData, error: e9 },
  ] = await Promise.all([
    supabase.from('groups').select('*'),
    supabase.from('venues').select('*'),
    supabase.from('teams').select('*'),
    supabase.from('players').select('*'),
    supabase.from('fixtures').select('*').order('kickoff_utc'),
    supabase.from('match_events').select('*').order('minute'),
    supabase.from('insights').select('*').eq('is_published', true),
    supabase.from('standings').select('*'),
    supabase.from('player_stats').select('*'),
  ]);

  if (e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9) {
    throw new Error('Supabase fetch failed');
  }

  if (teamsData) {
    const realTeamRows = teamsData.filter(row => row.fifa_code);
    const visibleTeamRows = realTeamRows.length > 0 ? realTeamRows : teamsData;

    teamCache = new Map(visibleTeamRows.map(row => [row.id, {
      id:           row.id,
      name:         row.name,
      shortCode:    row.short_code,
      flagEmoji:    row.flag_emoji,
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
        played:       row.played        ?? 0,
        won:          row.won           ?? 0,
        drawn:        row.drawn         ?? 0,
        lost:         row.lost          ?? 0,
        goalsFor:     row.goals_for     ?? 0,
        goalsAgainst: row.goals_against ?? 0,
        goalDiff:     row.goal_diff     ?? 0,
        points:       row.points        ?? 0,
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
    eventCache = eventsData
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
    return [...playerCache.values()].filter(p => p.teamId === teamId);
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

  async refreshMatch(fixtureId: string): Promise<boolean> {
    if (!supabase || !isSupabaseConfigured) return false;

    const [{ data: fixtureData, error: fixtureError }, { data: eventsData, error: eventsError }] = await Promise.all([
      supabase.from('fixtures').select('*').eq('id', fixtureId).maybeSingle(),
      supabase.from('match_events').select('*').eq('fixture_id', fixtureId).order('minute'),
    ]);

    if (fixtureError || eventsError || !fixtureData) {
      console.warn('[dataService] Match refresh failed', fixtureError ?? eventsError);
      return false;
    }

    const refreshedFixture = mapFixtureRow(fixtureData);
    fixtureCache = fixtureCache.map(fixture => fixture.id === fixtureId ? refreshedFixture : fixture);
    if (refreshedFixture.groupId) standingsCache.delete(refreshedFixture.groupId);

    const refreshedEvents = (eventsData ?? []).map(mapEventRow);
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

    return true;
  },

  // ── Derived: standings (mirrors the SQL standings view) ───────

  standingsForGroup(groupId: string): GroupTableRow[] {
    const cachedRows = standingsCache.get(groupId);
    if (cachedRows) return cachedRows;

    const group = groupCache.get(groupId);
    if (!group) return [];

    const rows = new Map<string, GroupTableRow>();
    for (const teamId of group.teamIds) {
      const team = teamCache.get(teamId);
      if (!team) continue;
      rows.set(teamId, { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 });
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

    return [...rows.values()].sort(
      (a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor
    );
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
