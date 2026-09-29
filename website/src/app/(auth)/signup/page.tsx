import type { Metadata } from "next";
import { AuthSwitch } from "@/components/auth/AuthBits";
import { SignupForm } from "@/components/auth/SignupForm";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Create your free account",
  description: "Join the Global Aviation Services Directory network — free for pilots, operators and aviation businesses.",
  robots: { index: false, follow: true },
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const isProvider = firstParam(sp.type) === "provider";
  const planParam = firstParam(sp.plan);
  const plan = planParam && /^[a-z0-9_-]{1,32}$/i.test(planParam) ? planParam.toLowerCase() : undefined;

  return (
    <>
      <SignupForm defaultService={isProvider ? "business" : "pilot"} plan={plan} />
      <AuthSwitch prompt="Already have an account?" href="/login" cta="Sign in" />
    </>
  );
}
