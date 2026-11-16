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
