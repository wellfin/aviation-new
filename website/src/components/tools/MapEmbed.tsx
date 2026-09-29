"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, TileLayer } from "leaflet";
import { useEffect, useRef } from "react";
import { publicConfig } from "@/lib/public-config";
import { cn } from "@/lib/utils";

const STREETS = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};
const SATELLITE = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
  maxZoom: 19,
};
/** OpenAIP aeronautical overlay (airspaces, navaids, airports) — needs NEXT_PUBLIC_OPENAIP_API_KEY. */
const OPENAIP = (key: string) => ({
  url: `https://api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(key)}`,
  attribution: '&copy; <a href="https://www.openaip.net">OpenAIP</a>',
  maxZoom: 14,
});

/**
 * Interactive airport map (Leaflet). Street or satellite base layer, the OpenAIP
 * aviation overlay when configured, and a marker at the airport reference point.
 */
export function MapEmbed({
  lat,
  lon,
  title,
  zoom = 13,
  mode = "roadmap",
  aviationLayer = true,
  className,
}: {
  lat: number;
  lon: number;
  title: string;
  zoom?: number;
  mode?: "roadmap" | "satellite";
  /** Show the OpenAIP overlay (only when a key is configured). */
  aviationLayer?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const baseRef = useRef<TileLayer | null>(null);
  const initial = useRef({ lat, lon, zoom, mode, aviationLayer, title });

  // Create the map once (Leaflet needs `window`, so it is loaded on the client only).
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      const init = initial.current;
      map = L.map(containerRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([init.lat, init.lon], init.zoom);
      const base = init.mode === "satellite" ? SATELLITE : STREETS;
      baseRef.current = L.tileLayer(base.url, { attribution: base.attribution, maxZoom: base.maxZoom }).addTo(map);
      if (init.aviationLayer && publicConfig.openAipKey) {
        const aip = OPENAIP(publicConfig.openAipKey);
        L.tileLayer(aip.url, { attribution: aip.attribution, maxNativeZoom: aip.maxZoom, maxZoom: 19, opacity: 0.9 }).addTo(map);
      }
      L.circleMarker([init.lat, init.lon], { radius: 8, color: "#ffffff", weight: 3, fillColor: "#2f80ed", fillOpacity: 1 })
        .addTo(map)
        .bindTooltip(init.title, { direction: "top", offset: [0, -8] });
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      baseRef.current = null;
    };
  }, []);

  // Follow prop changes without recreating the map.
  useEffect(() => {
    mapRef.current?.setView([lat, lon], zoom);
  }, [lat, lon, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !baseRef.current) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !baseRef.current) return;
      const base = mode === "satellite" ? SATELLITE : STREETS;
      baseRef.current.remove();
      baseRef.current = L.tileLayer(base.url, { attribution: base.attribution, maxZoom: base.maxZoom }).addTo(map);
      baseRef.current.bringToBack();
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return <div ref={containerRef} role="region" aria-label={title} className={cn("z-0 h-[490px] w-full overflow-hidden rounded-2xl bg-surface", className)} />;
}
