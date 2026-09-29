"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { ApiError, apiPost } from "@/lib/api/client";
import { contactSchema } from "@/lib/api/forms";
import { cn } from "@/lib/utils";

export const OTP_LENGTH = 4;

type OtpState = "idle" | "sending" | "sent" | "verifying" | "verified";

/**
 * Email field with inline "Send OTP" and a 4-digit verification row (Figma 696:81).
 * Calls POST /contact/email-otp and POST /contact/email-otp/verify.
 */
export function EmailOtp({
  error,
  onVerifiedChange,
  resetKey = 0,
}: {
  error?: string;
  onVerifiedChange: (email: string | null) => void;
  /** Bump to discard a verification the server no longer accepts (e.g. it expired). */
  resetKey?: number;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<OtpState>("idle");
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [message, setMessage] = useState<{ tone: "error" | "info" | "success"; text: string } | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const [seenResetKey, setSeenResetKey] = useState(resetKey);
  if (seenResetKey !== resetKey) {
    // Adjust state while rendering (not in an effect) when the parent discards the verification.
    setSeenResetKey(resetKey);
    setState("idle");
    setDigits(Array(OTP_LENGTH).fill(""));
    setMessage(null);
  }

  function changeEmail(value: string) {
    setEmail(value);
    if (state !== "idle") {
      setState("idle");
      setDigits(Array(OTP_LENGTH).fill(""));
      setMessage(null);
      onVerifiedChange(null);
    }
  }

  async function sendOtp() {
    const parsed = contactSchema.shape.email.safeParse(email);
    if (!parsed.success) {
      setMessage({ tone: "error", text: parsed.error.issues[0]?.message ?? "Enter a valid email address" });
      return;
    }
    setState("sending");
    setMessage(null);
    try {
      await apiPost("/contact/email-otp", { email: parsed.data });
      setState("sent");
      setMessage({ tone: "info", text: `We sent a ${OTP_LENGTH}-digit code to ${parsed.data}.` });
      requestAnimationFrame(() => refs.current[0]?.focus());
    } catch (err) {
      setState("idle");
      setMessage({ tone: "error", text: err instanceof ApiError ? (err.body.fieldErrors?.email ?? err.body.message) : "We couldn't send the code. Please try again." });
    }
  }

  async function verify() {
    const code = digits.join("");
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
      setMessage({ tone: "error", text: `Enter the ${OTP_LENGTH}-digit code` });
      return;
    }
    setState("verifying");
    try {
      await apiPost("/contact/email-otp/verify", { email: email.trim(), code });
      setState("verified");
      setMessage({ tone: "success", text: "Email verified." });
      onVerifiedChange(email.trim());
    } catch (err) {
      setState("sent");
      setMessage({ tone: "error", text: err instanceof ApiError ? (err.body.fieldErrors?.code ?? err.body.message) : "That code didn't match. Check it and try again." });
    }
  }

  function setDigit(i: number, value: string) {
    const d = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => prev.map((v, j) => (j === i ? d : v)));
    if (d && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "Enter") {
      e.preventDefault();
      void verify();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits(Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] ?? ""));
    refs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }

  const verified = state === "verified";
  const showCode = state === "sent" || state === "verifying";
  // A stale "please verify" error from the last submit no longer applies once verified.
  // …and once a code is on its way, the progress message replaces the form's "please verify" error.
  const ownError = message?.tone === "error" ? message.text : undefined;
  const shownError = verified ? undefined : (ownError ?? (state === "idle" ? error : undefined));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="contact-email" className="sr-only">
          Email address
        </label>
        <div
          className={cn(
            "flex h-[52px] items-center gap-2 rounded-xl border bg-white pr-1.5 pl-4 focus-within:ring-3 focus-within:ring-brand/15",
            shownError ? "border-danger" : "border-brand/20 focus-within:border-brand",
          )}
        >
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => changeEmail(e.target.value)}
            aria-invalid={shownError ? true : undefined}
            aria-describedby="contact-email-status"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-subtle"
          />
          {verified ? (
            <span className="rounded-3xl bg-success/12 px-3.5 py-1.5 text-sm font-semibold text-[#15803d]">✓ Verified</span>
          ) : (
            <button
              type="button"
              onClick={sendOtp}
              disabled={state === "sending"}
              className="bg-brand-gradient h-8 shrink-0 rounded-3xl px-3 text-[15px] whitespace-nowrap text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {state === "sending" ? "Sending…" : showCode ? "Resend" : "Send OTP"}
            </button>
          )}
        </div>
      </div>

      {showCode && (
        <fieldset className="flex items-center gap-3">
          <legend className="sr-only">Verification code</legend>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={onPaste}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              placeholder="*"
              aria-label={`Digit ${i + 1}`}
              className="h-11 w-full min-w-0 rounded-xl border border-brand/20 bg-white text-center text-[15px] text-ink outline-none placeholder:text-subtle focus:border-brand focus:ring-3 focus:ring-brand/15"
            />
          ))}
          <button
            type="button"
            onClick={verify}
            disabled={state === "verifying"}
            className="h-11 w-[104px] shrink-0 rounded-[27px] border border-[rgba(30,134,16,0.45)] bg-white text-[15px] text-success transition hover:bg-success/5 disabled:opacity-60"
          >
            {state === "verifying" ? "…" : "Verify"}
          </button>
        </fieldset>
      )}

      <p
        id="contact-email-status"
        role={shownError ? "alert" : "status"}
        className={cn("-mt-1 text-xs font-medium empty:hidden", shownError ? "text-danger" : message?.tone === "success" ? "text-[#15803d]" : "text-muted")}
      >
        {shownError ?? message?.text ?? ""}
      </p>
    </div>
  );
}
