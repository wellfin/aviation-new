// Builds src/lib/geo/states.json — { "<ISO country code>": ["State / province", …] } —
// from the country-state-city dataset (dev dependency, MIT). Run: npm run states:sync
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(readFileSync(path.join(root, "node_modules", "country-state-city", "lib", "assets", "state.json"), "utf8"));

const byCountry = {};
for (const s of source) {
  const name = String(s.name ?? "").trim();
  if (!name || !/^[A-Z]{2}$/.test(s.countryCode ?? "")) continue;
  (byCountry[s.countryCode] ??= new Set()).add(name);
}

const out = {};
for (const code of Object.keys(byCountry).sort()) {
  out[code] = [...byCountry[code]].sort((a, b) => a.localeCompare(b, "en"));
}

const dir = path.join(root, "src", "lib", "geo");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "states.json"), `${JSON.stringify(out)}\n`, "utf8");
const total = Object.values(out).reduce((n, list) => n + list.length, 0);
console.log(`states.json: ${Object.keys(out).length} countries, ${total} states/regions`);
