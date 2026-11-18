/**
 * Place names in "Title Case": first letter of each word capital, the rest small.
 * "new delhi" → "New Delhi", "SAO PAULO" → "Sao Paulo", "winston-salem" → "Winston-Salem".
 * Extra spaces are removed.
 */
export function titleCase(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en")
    .replace(/(^|[\s\-'(./])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase("en"));
}

/** Letters (any language), spaces, hyphens, apostrophes, dots and brackets; starts with a letter. */
export const PLACE_NAME = /^\p{L}[\p{L}\s.'()-]*$/u;
export const PLACE_NAME_MESSAGE = "Use letters only, e.g. New Delhi";

/** Capital first letter on each word, the rest as typed: "cargo charter" → "Cargo Charter", "AeroHub FBO" stays. */
export function capitalizeWords(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|[\s\-(/])(\p{Ll})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase("en"));
}

/** Capital first letter of the text, the rest as typed: "full CAMO support." → "Full CAMO support." */
export function sentenceCase(text: string): string {
  const t = text.trim();
  return t.replace(/^\p{Ll}/u, (ch) => ch.toLocaleUpperCase("en"));
}

export type AutoCase = "lower" | "words" | "place" | null;

/** Last part of a field name: "services.0.name" → "name", "cert-2-issuer" → "issuer", "contact.email2" → "email2". */
const lastPart = (name: string) => name.split(/[.\-[\]]/).filter(Boolean).pop() ?? "";

const WORD_FIELDS = new Set(["name", "firstname", "lastname", "fullname", "company", "advertiser", "issuer", "author", "authorrole", "role", "model", "longname"]);
const PLACE_FIELDS = new Set(["city", "region", "country", "location"]);

/**
 * How a text box tidies its value when the user leaves it:
 * emails and slugs in small letters; names ("Cargo Charter", "Captain David Osei") with capital first letters;
 * places ("Luton", "New Delhi") in Title Case.
 */
export function autoCaseFor(name: string | undefined, type: string | undefined): AutoCase {
  if (type && !["text", "email", "search"].includes(type)) return null;
  if (type === "search") return null;
  const part = lastPart(name ?? "").toLowerCase();
  if (type === "email" || /email\d*$/.test(part) || part === "slug") return "lower";
  if (PLACE_FIELDS.has(part)) return "place";
  if (WORD_FIELDS.has(part)) return "words";
  return null;
}

export function applyAutoCase(value: string, mode: AutoCase): string {
  if (mode === "lower") return value.trim().toLowerCase();
  if (mode === "place") return titleCase(value);
  if (mode === "words") return capitalizeWords(value);
  return value;
}

/** Writes a value into an input/textarea so React's onChange (and FormData) see it. */
export function setFieldValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  if (el.value === value) return;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
