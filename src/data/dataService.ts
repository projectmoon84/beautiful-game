/**
 * dataService — the single data access layer for the app.
 *
 * All screens and components import from here only. The mock arrays below
 * will be replaced with Supabase queries in Phase 7 without touching any
 * screen code — function signatures are the contract.
 */

import {
  TEAMS, GROUPS, VENUES, PLAYERS, FIXTURES, MATCH_EVENTS,
} from './mockData';
import type {
  Team, Player, Group, Venue, Fixture, MatchEvent,
  GroupTableRow, PlayerStat, InsightCard,
} from './types';

// ── Lookup maps (O(1) access) ─────────────────────────────────────
const teamMap = new Map<string, Team>(TEAMS.map(t => [t.id, t]));
const groupMap = new Map<string, Group>(GROUPS.map(g => [g.id, g]));
const venueMap = new Map<string, Venue>(VENUES.map(v => [v.id, v]));
const playerMap = new Map<string, Player>(PLAYERS.map(p => [p.id, p]));

// ── Core data access ─────────────────────────────────────────────

export const dataService = {
  team(id: string): Team | undefined {
    return teamMap.get(id);
  },

  allTeams(): Team[] {
    return TEAMS;
  },

  group(id: string): Group | undefined {
    return groupMap.get(id);
  },

  allGroups(): Group[] {
    return GROUPS;
  },

  venue(id: string): Venue | undefined {
    return venueMap.get(id);
  },

  player(id: string): Player | undefined {
    return playerMap.get(id);
  },

  squad(teamId: string): Player[] {
    return PLAYERS.filter(p => p.teamId === teamId);
  },

  allFixtures(): Fixture[] {
    return FIXTURES;
  },

  fixture(id: string): Fixture | undefined {
    return FIXTURES.find(f => f.id === id);
  },

  fixturesByDate(): Map<string, Fixture[]> {
    const map = new Map<string, Fixture[]>();
    for (const f of FIXTURES) {
      const day = f.kickoffUtc.slice(0, 10); // "2026-06-18"
      const existing = map.get(day) ?? [];
      map.set(day, [...existing, f]);
    }
    return map;
  },

  teamFixtures(teamId: string): Fixture[] {
    return FIXTURES.filter(f => f.homeTeamId === teamId || f.awayTeamId === teamId);
  },

  matchEvents(fixtureId: string): MatchEvent[] {
    return MATCH_EVENTS
      .filter(e => e.fixtureId === fixtureId)
      .sort((a, b) => a.minute - b.minute);
  },

  // ── Derived: standings (mirrors the Supabase view in Phase 7) ──

  standingsForGroup(groupId: string): GroupTableRow[] {
    const group = groupMap.get(groupId);
    if (!group) return [];

    const rows = new Map<string, GroupTableRow>();
    for (const teamId of group.teamIds) {
      const team = teamMap.get(teamId);
      if (!team) continue;
      rows.set(teamId, { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 });
    }

    for (const f of FIXTURES) {
      if (f.groupId !== groupId || f.status !== 'finished') continue;
      const hs = f.homeScore ?? 0;
      const as = f.awayScore ?? 0;

      const home = rows.get(f.homeTeamId);
      if (home) {
        home.played++;
        home.goalsFor += hs;
        home.goalsAgainst += as;
        if (hs > as) { home.won++; home.points += 3; }
        else if (hs === as) { home.drawn++; home.points += 1; }
        else home.lost++;
      }

      const away = rows.get(f.awayTeamId);
      if (away) {
        away.played++;
        away.goalsFor += as;
        away.goalsAgainst += hs;
        if (as > hs) { away.won++; away.points += 3; }
        else if (as === hs) { away.drawn++; away.points += 1; }
        else away.lost++;
      }
    }

    for (const row of rows.values()) {
      row.goalDiff = row.goalsFor - row.goalsAgainst;
    }

    return [...rows.values()].sort(
      (a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor
    );
  },

  // ── Derived: player stats (mirrors the player_stats view in Phase 7) ──

  playerStats(): PlayerStat[] {
    const stats = new Map<string, PlayerStat>();

    for (const e of MATCH_EVENTS) {
      const player = playerMap.get(e.playerId);
      if (!player) continue;

      if (!stats.has(e.playerId)) {
        stats.set(e.playerId, {
          playerId: e.playerId,
          playerName: player.name,
          teamId: player.teamId,
          goals: 0, assists: 0, yellowCards: 0, redCards: 0,
        });
      }
      const s = stats.get(e.playerId)!;

      if (e.type === 'goal' || e.type === 'penalty') s.goals++;
      if (e.type === 'yellow') s.yellowCards++;
      if (e.type === 'red') s.redCards++;

      if (e.assistPlayerId) {
        const assistPlayer = playerMap.get(e.assistPlayerId);
        if (assistPlayer) {
          if (!stats.has(e.assistPlayerId)) {
            stats.set(e.assistPlayerId, {
              playerId: e.assistPlayerId,
              playerName: assistPlayer.name,
              teamId: assistPlayer.teamId,
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

  // ── Editorial insight cards ────────────────────────────────────

  insights(): InsightCard[] {
    return [
      { kind: 'Highest scoring', teamId: 'BRA', value: '3 goals', blurb: 'vs Portugal — a Group C statement.' },
      { kind: 'Most cards',      teamId: 'GER', value: '2 yellows', blurb: 'Discipline a worry for the favourites.' },
      { kind: 'Dark horse',      teamId: 'NED', value: '12/1',     blurb: 'Held Germany; quietly building.' },
      { kind: 'Defying the odds',teamId: 'POR', value: 'Seed 7',   blurb: 'Punching above their seeding so far.' },
    ];
  },
};
