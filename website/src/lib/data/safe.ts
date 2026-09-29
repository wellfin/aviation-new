import "server-only";

/**
 * Resolves to `fallback` when a non-essential section's data can't be loaded
 * (API down / erroring), so the rest of the page still renders. Use it for
 * secondary sections only — a page's primary data should fail loudly into the
 * route's error boundary (and keep `notFound()` for 404s).
 */
export async function orFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    console.error("[data] section unavailable:", err instanceof Error ? err.message : err);
    return fallback;
  }
}
