import type { Advertisement } from "@/lib/types";

/**
 * Anchor props for an ad's click target. When the API supplies a `clickUrl`
 * (it records the click, then redirects to `href`) that is used instead of the
 * raw href. External destinations open in a new tab. Use a plain <a>, not
 * next/link, so the tracking URL is never prefetched.
 */
export function adLinkProps(ad: Advertisement): { href: string; target?: "_blank"; rel: string } {
  const external = ad.href.startsWith("http");
  return {
    href: ad.clickUrl ?? ad.href,
    ...(external ? { target: "_blank" as const, rel: "sponsored noopener noreferrer" } : { rel: "sponsored" }),
  };
}

/**
 * Ad images stored as absolute URLs (uploads served by an API host, or any external
 * host) are loaded by the browser directly instead of through next/image's optimizer,
 * which rejects hosts missing from next.config and would crash the whole page.
 */
export function isRemoteImage(src: string): boolean {
  return /^https?:\/\//i.test(src);
}
