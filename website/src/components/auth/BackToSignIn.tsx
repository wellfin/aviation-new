import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackToSignIn() {
  return (
    <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-subtle hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden />
      Back to sign in
    </Link>
  );
}
