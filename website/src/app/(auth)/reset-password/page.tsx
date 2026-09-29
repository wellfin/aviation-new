import type { Metadata } from "next";
import { AuthSwitch } from "@/components/auth/AuthBits";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { BackToSignIn } from "@/components/auth/BackToSignIn";
import { OtpDemoHint } from "@/components/auth/DemoHints";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Enter your reset code and choose a new password for your Global Aviation account.",
  robots: { index: false, follow: true },
};

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const email = firstParam(sp.email)?.trim().slice(0, 254);

  return (
    <>
      <BackToSignIn />
      <div className="pt-7">
        <AuthHeading
          centered
          icon="🔑"
          title="Choose a new password"
          subtitle="Enter the 6-digit code from your email and pick a new password"
        />
      </div>
      <ResetPasswordForm email={email || undefined} />
      <AuthSwitch prompt="Didn't get a code?" href="/forgot-password" cta="Send it again" />
      <OtpDemoHint />
    </>
  );
}
