/**
 * Formats a UTC ISO date string to a readable date in the user's local timezone.
 * "2026-06-18T20:00:00Z" → "Thu 18 Jun"
 */
export function formatDate(isoUtc: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date(isoUtc));
}

/**
 * Formats a UTC ISO date string to a time in the user's local timezone.
 * "2026-06-18T20:00:00Z" → "21:00" (for UK BST)
 */
export function formatTime(isoUtc: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(isoUtc));
}

/**
 * Returns the ISO date part of a UTC string (for grouping fixtures by day).
 * "2026-06-18T20:00:00Z" → "2026-06-18"
 */
export function isoDay(isoUtc: string): string {
  return isoUtc.slice(0, 10);
}
