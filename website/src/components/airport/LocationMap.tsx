"use client";

import { useState } from "react";
import Image from "next/image";
import { MapEmbed } from "@/components/tools/MapEmbed";

/** "Location" card with a Default Map / Satellite selector. */
export function LocationMap({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const [mode, setMode] = useState<"roadmap" | "satellite">("roadmap");
  return (
    <section aria-labelledby="location-heading" className="rounded-[20px] bg-white p-4 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] md:p-6">
      <div className="flex min-h-[45px] items-center justify-between gap-4">
        <h2 id="location-heading" className="flex items-center gap-2.5 text-xl leading-none font-bold text-ink md:text-2xl">
          <span className="flex p-[4.8px]">
            <Image src="/images/airport/location-icon.svg" alt="" width={20} height={20} className="size-5" />
          </span>
          Location
        </h2>
        <label className="sr-only" htmlFor="map-mode">
          Map type
        </label>
        <select
          id="map-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value === "satellite" ? "satellite" : "roadmap")}
          className="h-[36.4px] w-[114.4px] appearance-none rounded-[5px] border-[0.8px] border-[#ced4da] bg-[#f8f9fa] bg-[url('/images/airport/select-chevron.svg')] bg-[length:10px_6px] bg-[right_12px_center] bg-no-repeat pr-7 pl-3 text-xs font-light text-[#212529] shadow-[2px_3px_3px_-2px_rgba(0,0,0,0.06)] outline-none focus:border-brand"
        >
          <option value="roadmap">Default Map</option>
          <option value="satellite">Satellite</option>
        </select>
      </div>
      <MapEmbed lat={lat} lon={lon} mode={mode} title={`Map of ${name}`} className="mt-[26px] h-[300px] overflow-hidden rounded-3xl md:h-[493px]" />
    </section>
  );
}
