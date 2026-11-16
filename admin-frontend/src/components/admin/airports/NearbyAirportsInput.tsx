"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/admin/providers/form-kit";
import { FieldError } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { Airport } from "@/lib/types";

const MAX = 4;

const labelOf = (a: Airport) => [a.name, [a.city, a.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ");

/**
 * Up to 4 airports for the "Nearby Airport" tab, in display order. A code (ICAO, or IATA) is checked
 * against GET /airports/:code before it's added. Empty: the site lists the nearest airports by distance.
 */
export function NearbyAirportsInput({ icao, value, onChange, error }: { icao: string; value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);
  const [localError, setLocalError] = useState("");
  const [labels, setLabels] = useState<Record<string, string>>({});

  // Names for codes saved earlier.
  useEffect(() => {
    const missing = value.filter((c) => !(c in labels));
    if (!missing.length) return;
    let cancelled = false;
    void Promise.all(
      missing.map((c) =>
        apiRequest<Airport>("GET", `/airports/${encodeURIComponent(c)}`)
          .then((a) => [c, labelOf(a)] as const)
          .catch(() => [c, ""] as const),
      ),
    ).then((pairs) => {
      if (!cancelled) setLabels((l) => ({ ...l, ...Object.fromEntries(pairs) }));
    });
    return () => {
      cancelled = true;
    };
  }, [value, labels]);

  async function add() {
    const code = draft.trim().toUpperCase();
    if (!code) return;
    setLocalError("");
    if (!/^[A-Z0-9]{3,4}$/.test(code)) return setLocalError(`“${code}” isn't a valid ICAO (4) or IATA (3) code.`);
    setChecking(true);
    try {
      const a = await apiRequest<Airport>("GET", `/airports/${encodeURIComponent(code)}`);
      if (a.icao === icao.toUpperCase()) setLocalError("An airport can't be its own nearby airport.");
      else if (value.includes(a.icao)) setLocalError(`${a.icao} is already in the list.`);
      else {
        setLabels((l) => ({ ...l, [a.icao]: labelOf(a) }));
        onChange([...value, a.icao]);
        setDraft("");
      }
    } catch (err) {
      setLocalError(err instanceof ApiError && err.status === 404 ? `No airport with code ${code}.` : `Couldn't check ${code}. Try again.`);
    } finally {
      setChecking(false);
    }
  }

  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  const shown = localError || error;
  const full = value.length >= MAX;
  return (
    <div>
      {value.length > 0 && (
        <ol className="mb-3 flex flex-col gap-2" aria-label="Nearby airports, in display order">
          {value.map((code, i) => (
            <li key={code} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface text-xs font-bold text-muted">{i + 1}</span>
              <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg bg-brand/10 font-mono text-sm font-bold text-brand">{code}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{labels[code] ?? "…"}</span>
              <IconButton label={`Move ${code} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                <ArrowUp className="size-4" />
              </IconButton>
              <IconButton label={`Move ${code} down`} disabled={i === value.length - 1} onClick={() => move(i, i + 1)}>
                <ArrowDown className="size-4" />
              </IconButton>
              <IconButton label={`Remove ${code}`} danger onClick={() => onChange(value.filter((c) => c !== code))}>
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ol>
      )}
      <label htmlFor="nearby-input" className="mb-1.5 block text-xs font-semibold tracking-[0.6px] text-muted uppercase">
        Add airport by ICAO code
      </label>
      <div className="flex gap-2">
        <input
          id="nearby-input"
          value={draft}
          maxLength={4}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
          disabled={full}
          placeholder={full ? "4 airports added" : "e.g. EGKK"}
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? "nearby-error" : "nearby-hint"}
          className="h-10 w-40 rounded-xl border border-line bg-white px-3 font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:bg-surface aria-invalid:border-danger"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={checking || full || !draft.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-brand/40 px-3 text-sm font-semibold text-brand hover:bg-brand/5 disabled:opacity-40"
        >
          {checking ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
        </button>
      </div>
      {shown ? (
        <FieldError id="nearby-error" message={shown} />
      ) : (
        <p id="nearby-hint" className="mt-1.5 text-xs text-subtle">
          {value.length} / {MAX}. Use the arrows to change the order. Leave empty to show the nearest airports by distance.
        </p>
      )}
    </div>
  );
}
