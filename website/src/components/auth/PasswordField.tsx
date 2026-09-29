"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/Field";
import { passwordStrength } from "@/lib/api/forms";
import { cn } from "@/lib/utils";
import { AUTH_INPUT } from "./shared";

/** Password input with lock icon and show/hide toggle. */
export function PasswordField({ className, ...props }: Omit<ComponentProps<typeof Input>, "type" | "icon" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      className={cn(AUTH_INPUT, className)}
      icon={<Lock className="size-4" aria-hidden />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex size-7 items-center justify-center rounded-md text-subtle hover:text-ink"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      }
    />
  );
}

const LEVELS = [
  { label: "Too short", color: "bg-danger", text: "text-danger" },
  { label: "Weak", color: "bg-danger", text: "text-danger" },
  { label: "Good", color: "bg-success", text: "text-success" },
  { label: "Strong", color: "bg-success", text: "text-success" },
  { label: "Excellent", color: "bg-success", text: "text-success" },
] as const;

/** 4-segment strength meter under the password field. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const score = passwordStrength(password);
  const level = LEVELS[score];
  return (
    <div className="flex items-center gap-1 pt-3.5" aria-live="polite">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} aria-hidden className={cn("h-1 flex-1 rounded-full", i <= score ? level.color : "bg-line")} />
      ))}
      <span className={cn("w-[58px] pl-1 text-[10px] leading-[15px]", level.text)}>
        <span className="sr-only">Password strength: </span>
        {level.label}
      </span>
    </div>
  );
}
