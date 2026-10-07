// Builds the location reference data used by the State / Country / City dropdowns, from the
// country-state-city dataset (dev dependency, MIT). Run: npm run states:sync
//   src/lib/geo/states.json     { "<ISO country>": ["State / province", …] }
//   src/lib/geo/countries.json  [{ code, name, continent }]  (every country, with its continent)
//   public/geo/cities/<CC>.json { "<state name>": ["City", …] }  (fetched per country on demand)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "node_modules", "country-state-city", "lib", "assets");
const load = (f) => JSON.parse(readFileSync(path.join(assets, f), "utf8"));
const byName = (a, b) => a.localeCompare(b, "en");
const valid = (code) => /^[A-Z]{2}$/.test(code ?? "");

// ---- states
const states = load("state.json");
const stateSets = {};
const stateName = new Map(); // "IN-MH" → "Maharashtra"
for (const s of states) {
  const name = String(s.name ?? "").trim();
  if (!name || !valid(s.countryCode)) continue;
  (stateSets[s.countryCode] ??= new Set()).add(name);
  stateName.set(`${s.countryCode}-${s.isoCode}`, name);
}
const statesOut = {};
for (const code of Object.keys(stateSets).sort()) statesOut[code] = [...stateSets[code]].sort(byName);

// ---- countries with continents (from each country's first time zone; Middle East counts as Asia)
const SOUTH_AMERICA = new Set(["AR", "BO", "BR", "CL", "CO", "EC", "FK", "GF", "GS", "GY", "PE", "PY", "SR", "UY", "VE"]);
const OVERRIDES = {
  IS: "Europe", FO: "Europe", SJ: "Europe", PT: "Europe", ES: "Europe", TR: "Europe", RU: "Europe", CY: "Europe",
  BM: "North America", GL: "North America",
  AU: "Oceania", HM: "Oceania", FK: "South America", GS: "South America",
  CV: "Africa", SH: "Africa", MU: "Africa", SC: "Africa", KM: "Africa", MG: "Africa", RE: "Africa", YT: "Africa", TF: "Africa",
  MV: "Asia", IO: "Asia", CC: "Asia", CX: "Asia",
};
const REGION = { Asia: "Asia", Europe: "Europe", Africa: "Africa", Pacific: "Oceania", Australia: "Oceania" };
function continentOf(c) {
  if (OVERRIDES[c.isoCode]) return OVERRIDES[c.isoCode];
  const region = String(c.timezones?.[0]?.zoneName ?? "").split("/")[0];
  if (region === "America") return SOUTH_AMERICA.has(c.isoCode) ? "South America" : "North America";
  return REGION[region];
}
const countries = load("country.json")
  .filter((c) => valid(c.isoCode))
  .map((c) => ({ code: c.isoCode, name: String(c.name).trim(), ...(continentOf(c) ? { continent: continentOf(c) } : {}) }))
  .sort((a, b) => byName(a.name, b.name));

// ---- cities, grouped by country then state
const cities = {};
for (const [name, cc, sc] of load("city.json")) {
  if (!valid(cc) || !name) continue;
  const state = stateName.get(`${cc}-${sc}`) ?? "";
  ((cities[cc] ??= {})[state] ??= new Set()).add(String(name).trim());
}

const geo = path.join(root, "src", "lib", "geo");
mkdirSync(geo, { recursive: true });
writeFileSync(path.join(geo, "states.json"), `${JSON.stringify(statesOut)}\n`, "utf8");
writeFileSync(path.join(geo, "countries.json"), `${JSON.stringify(countries)}\n`, "utf8");

const cityDir = path.join(root, "public", "geo", "cities");
rmSync(cityDir, { recursive: true, force: true });
mkdirSync(cityDir, { recursive: true });
let cityTotal = 0;
for (const [cc, byState] of Object.entries(cities)) {
  const out = {};
  for (const s of Object.keys(byState).sort(byName)) {
    out[s] = [...byState[s]].sort(byName);
    cityTotal += out[s].length;
  }
  writeFileSync(path.join(cityDir, `${cc}.json`), JSON.stringify(out), "utf8");
}
const noContinent = countries.filter((c) => !c.continent).map((c) => c.code);
console.log(`states.json: ${Object.keys(statesOut).length} countries · countries.json: ${countries.length} (no continent: ${noContinent.join(" ") || "none"}) · cities: ${cityTotal} in ${Object.keys(cities).length} files`);
