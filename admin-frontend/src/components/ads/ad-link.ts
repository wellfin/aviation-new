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
