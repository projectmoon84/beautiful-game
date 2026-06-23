// ── Primitive types ──────────────────────────────────────────────
export type FormResult = 'W' | 'D' | 'L';
export type EventType = 'goal' | 'own_goal' | 'penalty' | 'penalty_missed' | 'var_goal' | 'var_cancelled' | 'yellow' | 'second_yellow' | 'red' | 'sub';
export type FixtureStatus = 'scheduled' | 'live' | 'finished';
export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';
export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

// ── Core entities (mirror §6 Supabase schema) ────────────────────

export interface Team {
  id: string;           // "BRA"
  name: string;         // "Brazil"
  shortCode: string;    // "BRA"
  flagEmoji: string;    // "🇧🇷"
  groupId: string;      // "C"
  seed: number;
  titleOdds: string;    // "13/2"
  primaryHex: string;
  secondaryHex: string;
  tertiaryHex: string;
  onPrimary?: string;   // computed by readableOn() if absent
  onSecondary?: string;
  funFact: string;
  triviaFacts?: string[];
  form: FormResult[];   // last 5, most recent first
}

export interface Player {
  id: string;           // "BRA-07"
  teamId: string;       // "BRA"
  name: string;
  shirtNumber: number;
  position: Position;
  dateOfBirth?: string; // ISO date, when known
}

export interface Group {
  id: string;           // "A"
  label: string;        // "Group A"
  teamIds: string[];    // ["ARG","FRA","URU","POL"]
}

export interface Venue {
  id: string;
  stadium: string;
  city: string;
  country: string;
  funFact: string;
}

export interface Fixture {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  groupId: string;
  kickoffUtc: string;   // ISO 8601
  stage: Stage;
  status: FixtureStatus;
  minute?: number;      // live only
  homeScore?: number;
  awayScore?: number;
  manOfMatchPlayerId?: string;
}

export interface MatchEvent {
  id: string;
  fixtureId: string;
  minute: number;
  type: EventType;
  teamId: string;
  playerId: string;
  assistPlayerId?: string;
  playerName?: string;
  assistPlayerName?: string;
}

// ── Derived/computed types ────────────────────────────────────────

export interface GroupTableRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface PlayerStat {
  playerId: string;
  playerName: string;
  teamId: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface InsightCard {
  kind: string;
  teamId: string;
  value: string;
  blurb: string;
}

// ── Match lineups ─────────────────────────────────────────────────

export interface LineupSlot {
  playerId: string;
  playerName: string;
  shirtNumber: number;
  position: Position;
  isStarter: boolean;
  subbedOffMinute?: number;
  subbedOnMinute?: number;
  subbedForPlayerId?: string;
}

export interface MatchLineup {
  fixtureId: string;
  teamId: string;
  formation?: string;
  players: LineupSlot[];
}

// ── Match team stats ──────────────────────────────────────────────

export interface MatchTeamStats {
  fixtureId: string;
  teamId: string;
  possessionPct?: number;
  shotsOnTarget?: number;
  shotsOffTarget?: number;
  shotsBlocked?: number;
  corners?: number;
  offsides?: number;
  fouls?: number;
  yellowCards?: number;
  redCards?: number;
}
