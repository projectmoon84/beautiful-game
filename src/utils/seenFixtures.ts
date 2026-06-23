const KEY = 'seen-fixtures';

function load(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); }
  catch { return {}; }
}

/**
 * Call when a user enters a match page.
 * Finished matches: store 'seen' — permanently revealed.
 * Live matches: store the current score string — re-obscures if the score changes.
 */
export function markFixtureSeen(fixtureId: string, homeScore: number, awayScore: number, status: string): void {
  const data = load();
  data[fixtureId] = status === 'finished' ? 'seen' : `${homeScore}-${awayScore}`;
  localStorage.setItem(KEY, JSON.stringify(data));
}

/**
 * Returns true when the score on a fixture card should be hidden.
 * - scheduled → never obscured (no score to show)
 * - finished  → obscured until the user has visited the match page
 * - live      → obscured whenever the score has advanced since the last visit
 */
export function isFixtureObscured(
  fixtureId: string,
  status: string,
  homeScore: number,
  awayScore: number,
): boolean {
  if (status === 'scheduled') return false;
  const entry = load()[fixtureId];
  if (!entry) return true;
  if (status === 'finished') return false;
  return entry !== `${homeScore}-${awayScore}`;
}
