"use client";

import { Flag } from "@/components/ui/Flag";
import { MapPin, Plus, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { Airport } from "@/lib/types";

import { EditorSection, UsageMeter, useSectionSave } from "./editor-kit";
import { airportsSchema } from "./schema";
import type { SectionProps } from "./TextSections";

interface Chip {
  icao: string;
  label: string;
  countryCode: string;
}

const MAX = 50;

export function AirportsSection({ listing, onSaved }: SectionProps) {
  const [chips, setChips] = useState<Chip[]>(listing.airports.map((a) => ({ icao: a.icao, label: [a.name, a.city].filter(Boolean).join(", "), countryCode: a.countryCode })));
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const { errors, saving, status, save } = useSectionSave(airportsSchema, onSaved);

  async function add() {
    const codes = [...new Set(input.toUpperCase().split(/[\s,;]+/).filter(Boolean))];
    if (codes.length === 0) return;
    const bad = codes.filter((c) => !/^[A-Z0-9]{3,4}$/.test(c));
    if (bad.length) {
      setInputError(`${bad.join(", ")} ${bad.length > 1 ? "aren't" : "isn't"} a valid ICAO (4) or IATA (3) code.`);
      return;
    }
    setChecking(true);
    setInputError(null);
    const problems: string[] = [];
    const added: Chip[] = [];
    for (const code of codes) {
      try {
        const a = await apiRequest<Airport>("GET", `/airports/${code}`);
        if (chips.some((c) => c.icao === a.icao) || added.some((c) => c.icao === a.icao)) continue;
        if (chips.length + added.length >= MAX) {
          problems.push(`You can list up to ${MAX} airports.`);
          break;
        }
        added.push({ icao: a.icao, label: [a.shortName || a.name, a.city].filter(Boolean).join(", "), countryCode: a.countryCode });
      } catch (err) {
        problems.push(err instanceof ApiError && err.status === 404 ? `We couldn't find an airport with code ${code}.` : `Couldn't check ${code}. Please try again.`);
      }
    }
    setChips((c) => [...c, ...added]);
    setInput(problems.length ? codes.filter((code) => !added.some((a) => a.icao === code)).join(" ") : "");
    setInputError(problems.length ? problems.join(" ") : null);
    setChecking(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void add();
    }
  }

  return (
    <EditorSection
      id="airports"
      title="Airports served"
      description="Airports where you operate. Your listing appears on each airport's page."
      meta={<UsageMeter used={chips.length} max={MAX} label="airports" />}
      saving={saving}
      status={status}
      onSubmit={() => save({ airports: chips.map((c) => c.icao) })}
    >
      {errors.airports && (
        <p role="alert" className="text-sm font-medium text-danger">
          {errors.airports}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Input
          name="airport-code"
          label="Add airport"
          placeholder="ICAO or IATA, e.g. EGLL or DXB"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          error={inputError ?? undefined}
          hint="Separate several codes with spaces or commas. Press Enter to add."
          wrapperClassName="flex-1"
          className="font-mono uppercase"
          maxLength={200}
          disabled={chips.length >= MAX}
        />
        <Button type="button" variant="outline" className="sm:mt-[22px]" loading={checking} disabled={!input.trim() || chips.length >= MAX} onClick={() => void add()}>
          <Plus className="size-4" aria-hidden /> Add
        </Button>
      </div>
      {chips.length === 0 ? (
        <p className="text-sm text-muted">No airports yet. Add at least one before submitting for review.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Airports served">
          {chips.map((c, i) => (
            <li key={c.icao} className={`inline-flex items-center gap-2 rounded-full border bg-white py-1 pr-1 pl-3 text-sm ${errors[`airports.${i}`] ? "border-danger" : "border-line"}`}>
              <MapPin className="size-3.5 text-brand" aria-hidden />
              <span className="font-mono font-bold text-ink">{c.icao}</span>
              {c.label && (
                <span className="max-w-[200px] truncate text-muted">
                  <Flag code={c.countryCode} className="mr-1" /> {c.label}
                </span>
              )}
              <button type="button" onClick={() => setChips((x) => x.filter((y) => y.icao !== c.icao))} aria-label={`Remove ${c.icao}`} className="flex size-6 items-center justify-center rounded-full text-subtle hover:bg-danger/10 hover:text-danger">
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </EditorSection>
  );
}
