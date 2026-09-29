import { redirect } from "next/navigation";
import { getAirport } from "@/lib/data/airports";
import { firstParam } from "@/lib/utils";

/**
 * Global search entry point used by the hero search bars.
 * An exact ICAO/IATA match goes straight to the airport page; anything else
 * goes to the airport directory search (falling back to the service directory).
 */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? "").trim();
  const scope = firstParam(sp.scope);
  if (!q) redirect(scope === "providers" ? "/directory" : "/airports");

  if (scope !== "providers" && /^[A-Za-z0-9]{3,4}$/.test(q)) {
    const airport = await getAirport(q);
    if (airport) redirect(`/airports/${airport.icao.toLowerCase()}`);
  }
  redirect(scope === "providers" ? `/directory?q=${encodeURIComponent(q)}` : `/airports?q=${encodeURIComponent(q)}`);
}
