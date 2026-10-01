/**
 * True when `value` starts with a calendar date (YYYY-MM-DD) that is not in the past.
 * "Today" is the visitor's local day, which can be one day behind or ahead of the
 * server's UTC day, so yesterday (UTC) is still accepted.
 */
export function isNotPastDate(value: string, now: Date = new Date()): boolean {
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(value)?.[1];
  if (!day) return false;
  const earliest = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  return day >= earliest;
}
