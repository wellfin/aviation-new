// Copies country flag SVGs (country-flag-icons, MIT) into public/flags/<CC>.svg.
// Flag emoji don't render on Windows, so the UI uses these images instead.
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "node_modules", "country-flag-icons", "3x2");
const dest = path.join(root, "public", "flags");
mkdirSync(dest, { recursive: true });
const files = readdirSync(src).filter((f) => /^[A-Z]{2}\.svg$/.test(f));
for (const f of files) cpSync(path.join(src, f), path.join(dest, f));
console.log(`Copied ${files.length} flags to public/flags`);
