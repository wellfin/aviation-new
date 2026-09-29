import type { Metadata } from "next";
import { OtpDemoHint } from "@/components/auth/DemoHints";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Enter the 6-digit code we emailed you to activate your Global Aviation account.",
  robots: { index: false, follow: true },
};

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const sp = await searchParams;
  const email = firstParam(sp.email)?.trim().slice(0, 254);

  return (
    <>
      <VerifyEmailForm email={email || undefined} />
      <OtpDemoHint />
    </>
  );
}
