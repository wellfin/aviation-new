"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormStatus } from "@/components/ui/Field";
import type { FormResult } from "@/lib/hooks/useZodForm";

/**
 * FormStatus for a `useZodForm` result, plus the obvious next step for auth
 * failures: sign in again (401) or verify the email address (EMAIL_NOT_VERIFIED).
 */
export function FormResultStatus({ result, nextPath }: { result: FormResult; nextPath?: string }) {
  const pathname = usePathname();
  if (result.status === "idle") return null;
  if (result.status === "success") return <FormStatus status="success" message={result.message} />;

  const next = encodeURIComponent(nextPath ?? pathname);
  let action: { href: string; label: string } | null = null;
  if (result.code === "EMAIL_NOT_VERIFIED") {
    // No ?email= here: that variant assumes a code was just sent and starts a resend cooldown.
    action = { href: "/verify-email", label: "Verify your email address →" };
  } else if (result.httpStatus === 401) {
    action = { href: `/login?next=${next}`, label: "Sign in to continue →" };
  }

  return (
    <div className="flex flex-col gap-2">
      <FormStatus status="error" message={result.message} />
      {action && (
        <Link href={action.href} className="self-start text-sm font-semibold text-brand hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}
