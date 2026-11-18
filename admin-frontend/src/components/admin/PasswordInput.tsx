"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/Field";

/** Password box with a lock icon and an eye button to show or hide what's typed. */
export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type" | "icon" | "trailing">) {
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      type={show ? "text" : "password"}
      icon={<Lock className="size-4" />}
      trailing={
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} className="flex text-muted hover:text-ink">
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}
