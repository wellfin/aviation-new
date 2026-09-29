"use client";

import { Search } from "lucide-react";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { cn } from "@/lib/utils";

const CODE = /^[A-Za-z0-9]{3,4}$/;

export const heroInputClass =
  "h-[52px] w-full rounded-xl border border-white/20 bg-white/10 pr-4 pl-10 text-[16px] text-white uppercase placeholder:text-white/50 placeholder:normal-case outline-none transition focus:border-brand-cyan focus:ring-3 focus:ring-brand-cyan/20 aria-invalid:border-danger sm:text-[18px]";

/**
 * GET form for the tool heroes. Submits `?icao=` (plus any extra fields passed as children)
 * to the current tool route after a client-side 3–4 character alphanumeric check.
 */
export function IcaoSearchForm({
  action,
  buttonLabel,
  defaultValue,
  children,
}: {
  action: string;
  buttonLabel: string;
  defaultValue?: string;
  children?: ReactNode;
}) {
  const id = useId();
  const [error, setError] = useState<string>();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const input = e.currentTarget.elements.namedItem("icao") as HTMLInputElement;
    const value = input.value.trim();
    if (!CODE.test(value)) {
      e.preventDefault();
      setError("Enter a 3–4 character ICAO or IATA code, e.g. EGLL or LHR.");
      input.focus();
      return;
    }
    input.value = value.toUpperCase();
    setError(undefined);
  }

  return (
    <form action={action} method="get" onSubmit={onSubmit} noValidate className="mx-auto w-full max-w-[560px]" role="search">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor={id} className="sr-only">
            Airport ICAO or IATA code
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-white/60" aria-hidden />
          <input
            id={id}
            name="icao"
            defaultValue={defaultValue}
            placeholder="Enter ICAO or IATA code, e.g. EGLL"
            autoComplete="off"
            spellCheck={false}
            maxLength={4}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={() => error && setError(undefined)}
            className={heroInputClass}
          />
        </div>
        {children}
        <button
          type="submit"
          className="h-[52px] shrink-0 rounded-xl bg-brand-gradient px-6 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(47,128,237,0.35)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
        >
          {buttonLabel}
        </button>
      </div>
      <p id={`${id}-error`} role="alert" className={cn("mt-2 text-left text-xs font-medium text-[#ff8a80]", !error && "sr-only")}>
        {error}
      </p>
    </form>
  );
}
