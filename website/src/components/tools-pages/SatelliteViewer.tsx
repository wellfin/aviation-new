"use client";

import { Compass, Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MapEmbed } from "@/components/tools/MapEmbed";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 10;
const MAX_ZOOM = 18;

/** Satellite/map toggle, zoom and fullscreen controls around the shared interactive map. */
export function SatelliteViewer({ lat, lon, icao, name }: { lat: number; lon: number; icao: string; name: string }) {
  const [mode, setMode] = useState<"satellite" | "roadmap">("satellite");
  const [zoom, setZoom] = useState(14);
  const [fullscreen, setFullscreen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frameRef.current?.requestFullscreen();
    } catch {
      setFullscreen(false);
    }
  }

  const ctrl = "flex size-8 items-center justify-center rounded-lg bg-brand/8 text-brand transition hover:bg-brand/15 disabled:opacity-40";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 rounded-[20px] bg-white p-3 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
        <div role="group" aria-label="Map type" className="flex gap-1">
          {(["satellite", "roadmap"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "h-8 rounded-lg px-4 text-xs font-semibold transition",
                mode === m ? "bg-brand-gradient text-white" : "bg-brand/8 text-brand hover:bg-brand/15",
              )}
            >
              {m === "satellite" ? "Satellite" : "Map"}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className={ctrl} onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-[76px] text-center font-mono text-xs text-muted" aria-live="polite">
            Zoom {zoom}
          </span>
          <button type="button" className={ctrl} onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
            <Plus className="size-4" aria-hidden />
          </button>
          <button type="button" className={ctrl} onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {fullscreen ? <Minimize2 className="size-3.5" aria-hidden /> : <Maximize2 className="size-3.5" aria-hidden />}
          </button>
        </div>
      </div>

      <div ref={frameRef} className="relative mt-4 overflow-hidden rounded-2xl bg-surface">
        <MapEmbed
          lat={lat}
          lon={lon}
          zoom={zoom}
          mode={mode}
          title={`${mode === "satellite" ? "Satellite" : "Map"} view of ${name}`}
          className={cn("rounded-2xl", fullscreen ? "h-screen" : "h-[360px] sm:h-[480px]")}
        />
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-white/10 bg-navy-900/85 px-3 py-2 backdrop-blur-sm">
          <p className="font-mono text-sm font-bold text-brand-cyan">{icao}</p>
          <p className="text-xs text-white/80">{name}</p>
        </div>
        <span className="pointer-events-none absolute right-4 bottom-10 flex size-10 items-center justify-center rounded-full bg-navy-900/85 text-white" aria-hidden>
          <Compass className="size-5" />
        </span>
      </div>
    </div>
  );
}
