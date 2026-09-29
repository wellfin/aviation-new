"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { FieldError } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { Airport } from "@/lib/types";
import { Chip } from "./form-kit";
import type { AirportChip } from "./schema";

/** ICAO/IATA multi-input; every code is checked against GET /airports/:code before it's added. */
export function AirportsInput({ value, onChange, max, error }: { value: AirportChip[]; onChange: (v: AirportChip[]) => void; max: number; error?: string }) {
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);
  const [localError, setLocalError] = useState("");

  async function add() {
    const codes = draft
      .toUpperCase()
      .split(/[\s,;]+/)
      .filter(Boolean);
    if (!codes.length) return;
    setLocalError("");
    const bad = codes.find((c) => !/^[A-Z0-9]{3,4}$/.test(c));
    if (bad) return setLocalError(`“${bad}” isn't a valid ICAO (4) or IATA (3) code.`);
    setChecking(true);
    const next = [...value];
    const problems: string[] = [];
    for (const code of codes) {
      if (next.length >= max) {
        problems.push(`At most ${max} airports.`);
        break;
      }
      try {
        const a = await apiRequest<Airport>("GET", `/airports/${encodeURIComponent(code)}`);
        if (!next.some((x) => x.icao === a.icao)) next.push({ icao: a.icao, label: [a.iata, a.shortName || a.name].filter(Boolean).join(" · ") });
      } catch (err) {
        problems.push(err instanceof ApiError && err.status === 404 ? `No airport with code ${code}.` : `Couldn't check ${code}. Try again.`);
      }
    }
    setChecking(false);
    onChange(next);
    setDraft(problems.length ? codes.filter((c) => problems.some((p) => p.includes(c))).join(" ") : "");
    setLocalError(problems.join(" "));
  }

  const shown = localError || error;
  return (
    <div>
      <label htmlFor="airports-input" className="mb-1.5 block text-xs font-semibold tracking-[0.6px] text-muted uppercase">
        Airports served
      </label>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Selected airports">
          {value.map((a) => (
            <li key={a.icao}>
              <Chip label={a.icao} sub={a.label} onRemove={() => onChange(value.filter((x) => x.icao !== a.icao))} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id="airports-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
          disabled={value.length >= max}
          placeholder="e.g. VABB or BOM, several separated by spaces"
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? "airports-error" : "airports-hint"}
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm uppercase outline-none placeholder:normal-case focus:border-brand focus:ring-3 focus:ring-brand/15 aria-invalid:border-danger"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={checking || !draft.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-brand/40 px-3 text-sm font-semibold text-brand hover:bg-brand/5 disabled:opacity-40"
        >
          {checking ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
        </button>
      </div>
      {!shown && (
        <p id="airports-hint" className="mt-1.5 text-xs text-subtle">
          {value.length} / {max}. Codes are checked against the airport database.
        </p>
      )}
      <FieldError id="airports-error" message={shown} />
    </div>
  );
}
