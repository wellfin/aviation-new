"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { applyAutoCase, autoCaseFor, sentenceCase, setFieldValue } from "@/lib/text";

const control =
  "w-full rounded-xl border border-line bg-white/80 px-3.5 text-sm text-ink placeholder:text-subtle outline-none transition hover:border-slate-300 focus:border-brand focus:bg-white focus:ring-3 focus:ring-brand/15 aria-invalid:border-danger aria-invalid:ring-danger/10 disabled:bg-surface";

export function Label({ htmlFor, children, className }: { htmlFor: string; children: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-[0.6px] text-muted", className)}>
      {children}
    </label>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-danger">
      {message}
    </p>
  );
}

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  wrapperClassName?: string;
}

export function Input({ label, error, hint, icon, trailing, wrapperClassName, className, id, name, onBlur, ...rest }: FieldProps & ComponentProps<"input">) {
  const fieldId = id ?? name ?? "field";
  // Leaving a name, place, email or slug box tidies it: "cargo charter" → "Cargo Charter", "LUTON" → "Luton", emails in small letters.
  const autoCase = rest.readOnly || rest.disabled ? null : autoCaseFor(name, rest.type);
  const errId = `${fieldId}-error`;
  return (
    <div className={wrapperClassName}>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <div className="relative">
        {icon && <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle">{icon}</span>}
        <input
          id={fieldId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={cn(control, "h-11", icon ? "pl-10" : undefined, trailing ? "pr-11" : undefined, className)}
          {...rest}
          onBlur={(e) => {
            if (autoCase) setFieldValue(e.currentTarget, applyAutoCase(e.currentTarget.value, autoCase));
            onBlur?.(e);
          }}
        />
        {trailing && <span className="absolute top-1/2 right-3 -translate-y-1/2">{trailing}</span>}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
      <FieldError id={errId} message={error} />
    </div>
  );
}

export function Textarea({ label, error, wrapperClassName, className, id, name, onBlur, ...rest }: FieldProps & ComponentProps<"textarea">) {
  const fieldId = id ?? name ?? "field";
  const errId = `${fieldId}-error`;
  return (
    <div className={wrapperClassName}>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <textarea
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={cn(control, "min-h-[120px] py-3", className)}
        {...rest}
        onBlur={(e) => {
          // Descriptions and messages start with a capital letter.
          if (!rest.readOnly && !rest.disabled) setFieldValue(e.currentTarget, sentenceCase(e.currentTarget.value));
          onBlur?.(e);
        }}
      />
      <FieldError id={errId} message={error} />
    </div>
  );
}

export function Select({
  label,
  error,
  wrapperClassName,
  className,
  id,
  name,
  children,
  ...rest
}: FieldProps & ComponentProps<"select">) {
  const fieldId = id ?? name ?? "field";
  const errId = `${fieldId}-error`;
  return (
    <div className={wrapperClassName}>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <select
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={cn(control, "h-11 appearance-none bg-[url('/images/shared/chevron-down-dark.svg')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-10", className)}
        {...rest}
      >
        {children}
      </select>
      <FieldError id={errId} message={error} />
    </div>
  );
}

/** Success / error banner shown after a form submission. */
export function FormStatus({ status, message }: { status: "success" | "error"; message: string }) {
  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-medium",
        status === "success" ? "border-success/30 bg-success/8 text-[#15803d]" : "border-danger/30 bg-danger/8 text-danger",
      )}
    >
      {message}
    </div>
  );
}
