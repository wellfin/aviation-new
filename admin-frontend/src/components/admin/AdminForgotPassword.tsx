"use client";

import Link from "next/link";
import { KeyRound, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { PasswordInput } from "./PasswordInput";

type Status = { status: "success" | "error"; message: string } | null;

const errorText = (err: unknown) => (err instanceof ApiError ? err.body.message : "Something went wrong. Please try again.");

/** Two steps: email → code from the email + new password. Staff accounts only. */
export function AdminForgotPassword() {
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setStatus(null);
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setErrors({ email: "Enter a valid email address" });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await apiRequest("POST", "/admin/auth/forgot-password", { email: address });
      setEmail(address);
      setStep("reset");
      setStatus({ status: "success", message: `If ${address} is a staff account, a 6-digit code is on its way. Check your inbox (and junk folder).` });
    } catch (err) {
      setStatus({ status: "error", message: errorText(err) });
    }
    setBusy(false);
  }

  async function reset(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    const found: Record<string, string> = {};
    if (!/^\d{4,8}$/.test(code.trim())) found.code = "Enter the code from your email";
    if (password.length < 8) found.password = "Use at least 8 characters";
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) found.password = "Include at least one letter and one number";
    if (confirm !== password) found.confirm = "Passwords don't match";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await apiRequest("POST", "/admin/auth/reset-password", { email, code: code.trim(), password });
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError && err.body.fieldErrors) setErrors(err.body.fieldErrors);
      setStatus({ status: "error", message: errorText(err) });
    }
    setBusy(false);
  }

  if (step === "done") {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <FormStatus status="success" message="Password changed. Sign in with your new password; other devices were signed out." />
        <Link href="/login" className="flex h-12 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white hover:brightness-110">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      {step === "email" ? (
        <form onSubmit={sendCode} noValidate className="mt-6 flex flex-col gap-4">
          {status && <FormStatus status={status.status} message={status.message} />}
          <Input label="Email" name="email" type="email" autoComplete="username" icon={<Mail className="size-4" />} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
          <Button type="submit" loading={busy} className="mt-2 w-full">
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={reset} noValidate className="mt-6 flex flex-col gap-4">
          {status && <FormStatus status={status.status} message={status.message} />}
          <Input
            label="Code from email"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            icon={<KeyRound className="size-4" />}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            error={errors.code}
            required
          />
          <PasswordInput label="New password" name="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="At least 8 characters, with a letter and a number." required />
          <PasswordInput label="Confirm new password" name="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} required />
          <Button type="submit" loading={busy} className="mt-2 w-full">
            Change password
          </Button>
          <button type="button" onClick={() => sendCode()} disabled={busy} className="text-sm font-semibold text-brand hover:underline disabled:opacity-50">
            Send a new code
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-muted hover:text-brand">
          ← Back to sign in
        </Link>
      </p>
    </>
  );
}
