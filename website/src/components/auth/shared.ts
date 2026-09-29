/** Input styling used on every auth form (52px tall, soft surface fill — per design). */
export const AUTH_INPUT = "h-[52px]! rounded-[14px]! bg-surface-2! text-sm! placeholder:text-ink/50!";

/** Full-width gradient submit button. */
export const AUTH_SUBMIT = "h-[52px]! w-full rounded-[14px]! text-sm font-bold! shadow-[0_4px_8px_rgba(47,128,237,0.3)]!";

/**
 * Only allow same-site relative redirects ("/path"), never protocol-relative
 * ("//evil.com") or backslash tricks ("/\evil.com").
 */
export function safeNextPath(next: string | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
