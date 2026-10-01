/** Today's date in the visitor's own time zone as YYYY-MM-DD — the format <input type="date"> uses. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** True when `value` (YYYY-MM-DD) is today or a later day. ISO dates compare correctly as strings. */
export function isTodayOrLater(value: string, now: Date = new Date()): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= todayIso(now);
}

/**
 * Ref callback for a date input that must not accept past days: sets `min` to today
 * once the element exists in the browser (so the server's clock/time zone never decides it).
 */
export function minToday(el: HTMLInputElement | null): void {
  if (el) el.min = todayIso();
}
