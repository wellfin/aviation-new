/** A run of text, optionally linked (internal path, mailto: or external URL). */
export type Inline = string | { text: string; href: string } | { text: string; strong: true };

/** Paragraph content: plain string or a sequence of inline runs. */
export type Rich = string | Inline[];

export type LegalBlock =
  | { type: "p"; text: Rich }
  | { type: "list"; items: Rich[]; ordered?: boolean }
  /** Grid of small cards — each with a short text or a bulleted list. */
  | { type: "cards"; columns?: 2 | 3; items: Array<{ title: string; text?: string; items?: string[] }> }
  /** Stacked rows with a check icon (e.g. data-subject rights). */
  | { type: "checks"; items: Array<{ title: string; text: string }> }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "callout"; tone: "info" | "warning"; title?: string; text: Rich }
  | { type: "address"; title: string; lines: string[]; email: string }
  | { type: "cta"; label: string; href: string }
  /** Icon/emoji feature tiles shown above the body (e.g. refund guarantees). */
  | { type: "highlights"; items: Array<{ emoji: string; title: string; text: string }> }
  /** Dark banner with a call-to-action. */
  | { type: "banner"; title: string; text: string; cta?: { label: string; href: string } }
  /** Interactive cookie preference manager (Cookies Policy only). */
  | { type: "cookie-manager" };

export interface LegalSection {
  /** URL fragment id — stable, kebab-case. */
  id: string;
  /** Short label used in the table of contents. */
  label: string;
  /** Full heading; defaults to `label`. */
  heading?: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  /** Last breadcrumb label and <h1> fallback. */
  crumb: string;
  title: string;
  summary: string;
  /** Human readable, e.g. "Last updated: 1 September 2026". */
  updated: string;
  /** Optional pill shown next to the updated date (e.g. "GDPR Compliant"). */
  badge?: string;
  tocTitle: string;
  /** Prefix section headings with "1.", "2." … */
  numberedHeadings: boolean;
  tocFooter?: { label: string; href: string };
  /** Blocks rendered before the first section (banners, highlight tiles). */
  lead?: LegalBlock[];
  sections: LegalSection[];
}
