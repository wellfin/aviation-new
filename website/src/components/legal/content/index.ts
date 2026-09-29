import type { LegalDoc } from "../types";
import { COOKIES_POLICY } from "./cookies";
import { GDPR_COMPLIANCE } from "./gdpr";
import { PRIVACY_POLICY } from "./privacy";
import { REFUND_POLICY } from "./refund";
import { TERMS_OF_SERVICE } from "./terms";

/** Legal documents keyed by their /legal/<slug> URL segment. */
export const LEGAL_DOCS = {
  privacy: PRIVACY_POLICY,
  terms: TERMS_OF_SERVICE,
  refund: REFUND_POLICY,
  cookies: COOKIES_POLICY,
  gdpr: GDPR_COMPLIANCE,
} satisfies Record<string, LegalDoc>;

export type LegalSlug = keyof typeof LEGAL_DOCS;

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return Object.hasOwn(LEGAL_DOCS, slug) ? LEGAL_DOCS[slug as LegalSlug] : undefined;
}
