import type { EventType, Fixture, MatchEvent } from '../data/types';

export type ResultQualifier = 'aet' | 'pens' | null;

const SHOOTOUT_TYPES = new Set<EventType>(['shootout_goal', 'shootout_miss', 'shootout_saved']);

export function isShootoutEvent(event: MatchEvent): boolean {
  return SHOOTOUT_TYPES.has(event.type);
}

export function isScoringEvent(event: MatchEvent): boolean {
  return (
    event.type === 'goal' ||
    event.type === 'own_goal' ||
    event.type === 'var_goal' ||
    event.type === 'penalty'
  );
}

export function isExtraTimeEvent(event: MatchEvent): boolean {
  return !isShootoutEvent(event) && event.minute > 90;
}

export function isFinishedKnockoutDraw(fixture: Fixture): boolean {
  return (
    fixture.status === 'finished' &&
    fixture.stage !== 'group' &&
    fixture.homeScore !== undefined &&
    fixture.awayScore !== undefined &&
    fixture.homeScore === fixture.awayScore
  );
}

export function resultQualifier(fixture: Fixture, events: MatchEvent[]): ResultQualifier {
  if (fixture.status !== 'finished' || fixture.stage === 'group') return null;
  if (events.some(isShootoutEvent) || isFinishedKnockoutDraw(fixture)) return 'pens';
  if (events.some(isExtraTimeEvent) || (fixture.minute ?? 0) > 90) return 'aet';
  return null;
}

export function resultQualifierLabel(qualifier: ResultQualifier): string | null {
  if (qualifier === 'pens') return 'Pens';
  if (qualifier === 'aet') return 'AET';
  return null;
}

export function timelineMinuteLabel(event: MatchEvent): { phase?: 'ET' | 'PEN'; minute: string } {
  if (isShootoutEvent(event)) return { phase: 'PEN', minute: String(event.minute) };
  if (event.minute > 90) return { phase: 'ET', minute: `${event.minute}'` };
  return { minute: `${event.minute}'` };
}
