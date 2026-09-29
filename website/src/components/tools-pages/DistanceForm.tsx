"use client";

import { ArrowLeftRight, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import { heroInputClass } from "@/components/tools-pages/IcaoSearchForm";
import { cn } from "@/lib/utils";

const CODE = /^[A-Za-z0-9]{3,4}$/;

/** Two-airport GET form (`?from=&to=`) for the distance calculator. */
export function DistanceForm({ from, to }: { from?: string; to?: string }) {
  const id = useId();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const next: { from?: string; to?: string } = {};
    const f = fromRef.current;
    const t = toRef.current;
    if (!f || !t) return;
    if (!CODE.test(f.value.trim())) next.from = "Enter a 3–4 character departure code.";
    if (!CODE.test(t.value.trim())) next.to = "Enter a 3–4 character destination code.";
    else if (t.value.trim().toUpperCase() === f.value.trim().toUpperCase()) next.to = "Choose two different airports.";
    setErrors(next);
    if (next.from || next.to) {
      e.preventDefault();
      (next.from ? f : t).focus();
      return;
    }
    f.value = f.value.trim().toUpperCase();
    t.value = t.value.trim().toUpperCase();
  }

  function swap() {
    if (!fromRef.current || !toRef.current) return;
    [fromRef.current.value, toRef.current.value] = [toRef.current.value, fromRef.current.value];
    setErrors({});
  }

  const field = (key: "from" | "to", label: string, ref: typeof fromRef, value?: string) => {
    const Icon = key === "from" ? PlaneTakeoff : PlaneLanding;
    const inputId = `${id}-${key}`;
    return (
      <div className="relative flex-1">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <Icon className="pointer-events-none absolute top-[26px] left-4 size-4 -translate-y-1/2 text-white/60" aria-hidden />
        <input
          ref={ref}
          id={inputId}
          name={key}
          defaultValue={value}
          placeholder={key === "from" ? "From, e.g. EGLL" : "To, e.g. KJFK"}
          autoComplete="off"
          spellCheck={false}
          maxLength={4}
          aria-invalid={errors[key] ? true : undefined}
          aria-describedby={errors[key] ? `${inputId}-error` : undefined}
          className={heroInputClass}
        />
        {errors[key] && (
          <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-left text-xs font-medium text-[#ff8a80]">
            {errors[key]}
          </p>
        )}
      </div>
    );
  };

  return (
    <form action="/tools/distance" method="get" onSubmit={onSubmit} noValidate className="mx-auto w-full max-w-[680px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {field("from", "Departure airport code", fromRef, from)}
        <button
          type="button"
          onClick={swap}
          aria-label="Swap airports"
          className={cn("flex size-[52px] shrink-0 items-center justify-center self-center rounded-xl border border-white/20 bg-white/10 text-white/80 transition hover:bg-white/15 sm:self-start")}
        >
          <ArrowLeftRight className="size-4 rotate-90 sm:rotate-0" aria-hidden />
        </button>
        {field("to", "Destination airport code", toRef, to)}
        <button
          type="submit"
          className="h-[52px] shrink-0 rounded-xl bg-brand-gradient px-6 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(47,128,237,0.35)] transition hover:brightness-110"
        >
          Calculate
        </button>
      </div>
    </form>
  );
}
