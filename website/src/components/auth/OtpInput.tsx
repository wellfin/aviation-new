"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

const LENGTH = 6;

/**
 * Six single-digit boxes. Typing advances focus, Backspace steps back,
 * arrow keys move, and pasting (or SMS/email autofill) spreads the code across boxes.
 */
export function OtpInput({
  value,
  onChange,
  invalid,
  disabled,
  describedBy,
}: {
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  // Empty boxes are stored as spaces so positions survive gaps ("12 4").
  const digits = Array.from({ length: LENGTH }, (_, i) => (value[i] && value[i] !== " " ? value[i] : ""));
  const emit = (next: string[]) => onChange(next.map((c) => c || " ").join("").trimEnd());

  const focus = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  function fillFrom(index: number, input: string) {
    const incoming = input.replace(/\D/g, "");
    if (!incoming) return;
    const next = [...digits];
    for (let k = 0; k < incoming.length && index + k < LENGTH; k++) next[index + k] = incoming[k];
    emit(next);
    focus(index + incoming.length);
  }

  function handleChange(i: number, raw: string, caret: number | null) {
    if (raw === "") {
      const next = [...digits];
      next[i] = "";
      emit(next);
      return;
    }
    // If the box already held a digit, keep only the newly inserted text (the chars just before the caret).
    const current = digits[i];
    if (current && raw.length > current.length) {
      const end = caret ?? raw.length;
      fillFrom(i, raw.slice(Math.max(0, end - (raw.length - current.length)), end));
      return;
    }
    fillFrom(i, raw);
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) {
        next[i] = "";
      } else if (i > 0) {
        next[i - 1] = "";
        focus(i - 1);
      }
      emit(next);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  }

  function handlePaste(i: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    fillFrom(i, e.clipboardData.getData("text"));
  }

  return (
    <div>
      <div role="group" aria-label="6-digit verification code" className="flex justify-center gap-2 sm:gap-2.5">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            pattern="\d*"
            maxLength={i === 0 ? LENGTH : 1}
            value={d}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(e) => handleChange(i, e.target.value, e.target.selectionStart)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "h-[60px] w-full max-w-[52px] min-w-0 flex-1 rounded-[14px] border-[1.5px] border-line bg-white text-center text-2xl font-bold text-ink outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:bg-surface",
              d && "border-brand/50",
              invalid && "border-danger focus:border-danger focus:ring-danger/10",
            )}
          />
        ))}
      </div>
      <div className="mt-6 flex justify-center gap-1.5" aria-hidden>
        {digits.map((d, i) => (
          <span key={i} className={cn("size-2 rounded-full transition-colors", d ? "bg-brand" : "bg-line")} />
        ))}
      </div>
    </div>
  );
}
