"use client";

import { useState } from "react";
import { MapPinned } from "lucide-react";
import { MapEmbed } from "@/components/tools/MapEmbed";

/** "Location" card with a Default Map / Satellite selector. */
export function LocationMap({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const [mode, setMode] = useState<"roadmap" | "satellite">("roadmap");
  return (
    <section aria-labelledby="location-heading" className="rounded-[20px] bg-white p-4 shadow-card md:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="location-heading" className="flex items-center gap-3 text-xl font-bold text-ink">
          <MapPinned className="size-5 text-muted" aria-hidden /> Location
        </h2>
        <label className="sr-only" htmlFor="map-mode">
          Map type
        </label>
        <select
          id="map-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value === "satellite" ? "satellite" : "roadmap")}
          className="h-9 rounded-md border border-line bg-white pr-8 pl-3 text-xs font-medium text-muted shadow-soft outline-none focus:border-brand"
        >
          <option value="roadmap">Default Map</option>
          <option value="satellite">Satellite</option>
        </select>
      </div>
      <MapEmbed lat={lat} lon={lon} mode={mode} title={`Map of ${name}`} className="mt-6 h-[300px] md:h-[500px]" />
    </section>
  );
}
