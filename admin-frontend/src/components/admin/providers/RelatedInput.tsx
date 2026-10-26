"use client";

import { ArrowDown, ArrowUp, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FieldError } from "@/components/ui/Field";
import { apiRequest } from "@/lib/api/client";

interface Hit {
  slug: string;
  name: string;
  tier?: string;
}

const iconBtn = "inline-flex size-8 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-surface hover:text-ink disabled:opacity-40";

/**
 * Picks the listings shown in a profile's "Related …" sidebar card, in order. Search by name, click a
 * result to add it. Leaving it empty keeps the automatic list.
 */
export function RelatedInput({ value, onChange, self, max = 8, error }: { value: string[]; onChange: (v: string[]) => void; self?: string; max?: number; error?: string }) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);

  // Names for slugs already chosen (saved earlier).
  useEffect(() => {
    const missing = value.filter((s) => !names[s]);
    if (missing.length === 0) return;
    let live = true;
    void Promise.all(missing.map((s) => apiRequest<Hit>("GET", `/providers/${encodeURIComponent(s)}`).catch(() => ({ slug: s, name: s }))))
      .then((rows) => live && setNames((n) => ({ ...n, ...Object.fromEntries(rows.map((r) => [r.slug ?? "", r.name])) })));
    return () => {
      live = false;
    };
  }, [value, names]);

  // Search as you type (short pause between keystrokes).
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let live = true;
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiRequest<{ items: Hit[] }>("GET", `/admin/providers?q=${encodeURIComponent(term)}&pageSize=8`);
        if (live) setHits(res.items.filter((h) => h.slug !== self));
      } catch {
        if (live) setHits([]);
      } finally {
        if (live) setSearching(false);
      }
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [q, self]);

  // Results only while a search term is typed.
  const shownHits = q.trim().length >= 2 ? hits : [];

  function add(h: Hit) {
    setNames((n) => ({ ...n, [h.slug]: h.name }));
    if (!value.includes(h.slug) && value.length < max) onChange([...value, h.slug]);
    setQ("");
    setHits([]);
  }
  function move(i: number, dir: -1 | 1) {
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir]!, next[i]!];
    onChange(next);
  }

  return (
    <div>
      <label htmlFor="related-search" className="mb-1.5 block text-xs font-semibold tracking-[0.6px] text-muted uppercase">
        Related providers ({value.length}/{max})
      </label>
      {value.length > 0 && (
        <ol className="mb-2 flex flex-col gap-1.5" aria-label="Chosen related providers">
          {value.map((s, i) => (
            <li key={s} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm">
              <span className="w-5 text-xs font-bold text-muted">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{names[s] ?? s}</span>
              <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${names[s] ?? s} up`}>
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" className={iconBtn} disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${names[s] ?? s} down`}>
                <ArrowDown className="size-3.5" />
              </button>
              <button type="button" className={iconBtn} onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Remove ${names[s] ?? s}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="relative">
        <input
          id="related-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={value.length >= max}
          placeholder={value.length >= max ? `At most ${max}` : "Search a provider by name, e.g. NJETS"}
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
        />
        {searching && <Loader2 className="absolute top-3 right-3 size-4 animate-spin text-muted" aria-hidden />}
        {shownHits.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-card" role="listbox" aria-label="Matching providers">
            {shownHits.map((h) => (
              <li key={h.slug}>
                <button
                  type="button"
                  onClick={() => add(h)}
                  disabled={value.includes(h.slug)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface disabled:opacity-50"
                >
                  <span className="truncate font-medium text-ink">{h.name}</span>
                  {h.tier && <span className="shrink-0 text-xs text-muted">{h.tier === "ultra_pro" ? "Ultra Pro" : h.tier === "pro" ? "Pro" : "Basic"}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted">Shown on this profile&apos;s &ldquo;Related …&rdquo; card in this order. Leave empty to show related listings automatically.</p>
      <FieldError id="related-error" message={error} />
    </div>
  );
}
