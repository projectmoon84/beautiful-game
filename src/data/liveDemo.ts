import type { Fixture, MatchEvent } from './types';

export const LIVE_DEMO_FIXTURE: Fixture = {
  id: 'live-demo',
  homeTeamId: 'BRA',
  awayTeamId: 'POR',
  venueId: 'OF-V-NEW-YORK-NEW-JERSEY-EAST-RUTHERFORD',
  groupId: 'C',
  kickoffUtc: '2026-06-13T19:00:00Z',
  stage: 'group',
  status: 'live',
  minute: 89,
  homeScore: 3,
  awayScore: 2,
};

export const LIVE_DEMO_EVENTS: MatchEvent[] = [
  { id: 'live-demo-1', fixtureId: 'live-demo', minute: 23, type: 'goal', teamId: 'BRA', playerId: 'BRA-P07', assistPlayerId: 'BRA-P19' },
  { id: 'live-demo-2', fixtureId: 'live-demo', minute: 48, type: 'goal', teamId: 'BRA', playerId: 'BRA-P07', assistPlayerId: 'BRA-P15' },
  { id: 'live-demo-3', fixtureId: 'live-demo', minute: 69, type: 'goal', teamId: 'POR', playerId: 'POR-P08', assistPlayerId: 'POR-P20' },
  { id: 'live-demo-4', fixtureId: 'live-demo', minute: 70, type: 'yellow', teamId: 'BRA', playerId: 'BRA-P05' },
  { id: 'live-demo-5', fixtureId: 'live-demo', minute: 85, type: 'goal', teamId: 'POR', playerId: 'POR-P02', assistPlayerId: 'POR-P12' },
  { id: 'live-demo-6', fixtureId: 'live-demo', minute: 87, type: 'goal', teamId: 'BRA', playerId: 'BRA-P15', assistPlayerId: 'BRA-P08' },
];
