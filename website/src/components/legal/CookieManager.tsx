"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { FormStatus } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { COOKIE_CATEGORIES, type CookieCategoryId } from "./content/cookies";

const COOKIE_PREFS_KEY = "ga_cookie_prefs";
const CHANGE_EVENT = "ga-cookie-prefs-change";

type Optional = Exclude<CookieCategoryId, "essential">;
type Prefs = Record<Optional, boolean>;

interface StoredCookiePrefs extends Prefs {
  necessary: true;
  updatedAt: string;
}

const OPTIONAL = COOKIE_CATEGORIES.filter((c): c is (typeof COOKIE_CATEGORIES)[number] & { id: Optional } => !c.required);
const DEFAULTS = Object.fromEntries(OPTIONAL.map((c) => [c.id, c.defaultOn])) as Prefs;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(COOKIE_PREFS_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Prefs | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<StoredCookiePrefs>;
    return { analytics: v.analytics === true, functional: v.functional === true, marketing: v.marketing === true };
  } catch {
    return null;
  }
}

function persist(prefs: Prefs): boolean {
  const value: StoredCookiePrefs = { necessary: true, ...prefs, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-12 shrink-0 items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        checked ? "bg-brand-gradient" : "bg-line",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className={cn("absolute size-5 rounded-full bg-white shadow transition-all", checked ? "left-[26px]" : "left-0.5")} />
    </button>
  );
}

/** Cookie category cards + "Save Your Preferences" panel, persisted in localStorage. */
export function CookieManager() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const saved = parse(raw);
  const [draft, setDraft] = useState<Prefs | null>(null);
  const [status, setStatus] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const prefs = draft ?? saved ?? DEFAULTS;

  function set(id: Optional, value: boolean) {
    setDraft({ ...prefs, [id]: value });
    setStatus(null);
  }

  function save(next: Prefs, message: string) {
    if (persist(next)) {
      setDraft(null);
      setStatus({ status: "success", message });
    } else {
      setStatus({ status: "error", message: "Your browser blocked saving preferences. Check that site storage is allowed and try again." });
    }
  }

  const allOff = Object.fromEntries(OPTIONAL.map((c) => [c.id, false])) as Prefs;
  const allOn = Object.fromEntries(OPTIONAL.map((c) => [c.id, true])) as Prefs;

  return (
    <div className="flex flex-col gap-4">
      {COOKIE_CATEGORIES.map((c) => {
        const on = c.required ? true : prefs[c.id as Optional];
        return (
          <div key={c.id} className="rounded-2xl border border-line/60 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
                  {c.name}
                  {c.required && (
                    <span className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.6px] text-[#00a3d9] uppercase">
                      Required
                    </span>
                  )}
                </h3>
                <p className="mt-1.5 text-sm leading-5 text-muted">{c.description}</p>
              </div>
              <Switch checked={on} disabled={c.required} label={c.required ? `${c.name} are always on` : c.name} onChange={c.required ? undefined : (v) => set(c.id as Optional, v)} />
            </div>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${c.name} set`}>
              {c.cookies.map((name) => (
                <li key={name} className="rounded-md bg-brand/8 px-2 py-0.5 font-mono text-xs text-brand">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <div id="manage-preferences" className="mt-4 scroll-mt-24 rounded-2xl border border-line/60 bg-white p-5 shadow-soft sm:p-6">
        <h3 className="text-base font-bold text-ink">Save Your Preferences</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {OPTIONAL.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line/60 bg-surface px-3 py-2.5">
              <span className="text-sm text-ink">{c.name}</span>
              <Switch checked={prefs[c.id]} label={c.name} onChange={(v) => set(c.id, v)} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={() => save(prefs, "Your cookie preferences have been saved.")}>
            Save Preferences
          </Button>
          <Button type="button" variant="outline" onClick={() => save(allOff, "Only essential cookies are enabled.")}>
            Essential Only
          </Button>
          <Button type="button" variant="outline" onClick={() => save(allOn, "All cookies are enabled. Thank you!")}>
            Accept All
          </Button>
        </div>
        {draft && <p className="mt-3 text-xs text-subtle">You have unsaved changes.</p>}
        {status && (
          <div className="mt-4">
            <FormStatus status={status.status} message={status.message} />
          </div>
        )}
      </div>
    </div>
  );
}
