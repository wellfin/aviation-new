"use client";

import { Plane } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

const CODE_RE = /^[A-Z]{3,4}$/;

type Errors = Partial<Record<"from" | "to", string>>;

function validate(from: string, to: string): Errors {
  const errors: Errors = {};
  if (!CODE_RE.test(from)) errors.from = "Enter a 3–4 letter airport code (e.g. KJFK).";
  if (!CODE_RE.test(to)) errors.to = "Enter a 3–4 letter airport code (e.g. KLAX).";
  if (!errors.from && !errors.to && from === to) errors.to = "Choose a different destination airport.";
  return errors;
}

function CodeField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  labelClass,
}: {
  id: "from" | "to";
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  labelClass: string;
}) {
  return (
    <div className="w-full md:w-[262px]">
      <div
        className={cn(
          "flex h-[41px] overflow-hidden rounded-lg border bg-white transition focus-within:border-brand-cyan",
          error ? "border-danger" : "border-[#f8f8f8]",
        )}
      >
        <label htmlFor={`distance-${id}`} className={cn("flex w-[65px] shrink-0 items-center justify-center text-base font-semibold text-[#ebebeb]", labelClass)}>
          {label}
        </label>
        <input
          id={`distance-${id}`}
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `distance-${id}-error` : undefined}
          className="min-w-0 flex-1 border-l border-line px-3 text-sm text-ink uppercase outline-none placeholder:text-muted placeholder:normal-case"
        />
      </div>
      {error && (
        <p id={`distance-${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-[#ff8a80]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Home-page quick distance bar; validates both codes, then opens /tools/distance?from=…&to=… */
export function DistanceCalculator({ className }: { className?: string }) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = validate(from, to);
    setErrors(next);
    if (next.from || next.to) return;
    router.push(`/tools/distance?from=${from}&to=${to}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Airport distance calculator"
      className={cn("flex flex-col gap-4 rounded-[10px] bg-navy-900 px-5 py-4 md:flex-row md:items-start md:gap-0 md:px-8", className)}
    >
      <h2 className="text-base font-semibold text-white md:mr-[26px] md:h-[41px] md:content-center md:whitespace-nowrap">Airport Distance Calculator</h2>
      <CodeField id="from" label="From :" value={from} onChange={setFrom} placeholder="ICAO example : KJFK" error={errors.from} labelClass="bg-[#1862c1]" />
      <span className="hidden h-[41px] w-[84px] shrink-0 items-center justify-center md:flex" aria-hidden>
        <Plane className="size-6 rotate-45 fill-white text-white" />
      </span>
      <CodeField id="to" label="To :" value={to} onChange={setTo} placeholder="ICAO example : KLAX" error={errors.to} labelClass="bg-brand-gradient" />
      <button
        type="submit"
        className="h-[39px] shrink-0 rounded-[7px] bg-brand-gradient px-[13px] text-base font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan md:mt-px md:ml-[26px] md:w-[100px]"
      >
        Calculate
      </button>
    </form>
  );
}
