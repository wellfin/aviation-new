"use client";

import { Flag } from "@/components/ui/Flag";
import { ArrowLeft, ChevronDown, Mail, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/Button";
import { FieldError, FormStatus, Input, Label } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { signupSchema } from "@/lib/api/forms";
import { useAuth } from "@/lib/auth/auth-context";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { cn } from "@/lib/utils";
import { AuthHeading } from "./AuthHeading";
import { PasswordField, PasswordStrengthMeter } from "./PasswordField";
import { SIGNUP_SERVICES, signupDetailsSchema, type SignupService } from "./schema";
import { AUTH_INPUT, AUTH_SUBMIT } from "./shared";
import { SocialButtons } from "./SocialButtons";

const DIAL_CODES = [
  { country: "IN", name: "India", dial: "+91" },
  { country: "US", name: "United States", dial: "+1" },
  { country: "GB", name: "United Kingdom", dial: "+44" },
  { country: "AE", name: "United Arab Emirates", dial: "+971" },
  { country: "SA", name: "Saudi Arabia", dial: "+966" },
  { country: "SG", name: "Singapore", dial: "+65" },
  { country: "AU", name: "Australia", dial: "+61" },
  { country: "CA", name: "Canada", dial: "+1" },
  { country: "DE", name: "Germany", dial: "+49" },
  { country: "FR", name: "France", dial: "+33" },
  { country: "CH", name: "Switzerland", dial: "+41" },
  { country: "HK", name: "Hong Kong", dial: "+852" },
  { country: "ZA", name: "South Africa", dial: "+27" },
  { country: "BR", name: "Brazil", dial: "+55" },
] as const;

type AccountBasics = z.infer<typeof signupSchema>;

const STEP_ONE_FIELDS = new Set(["firstName", "lastName", "email", "password"]);
type SignupPayload = Parameters<ReturnType<typeof useAuth>["signup"]>[0] & { service: SignupService };

function StepLabel({ step, onBack }: { step: 1 | 2; onBack?: () => void }) {
  return (
    <div className="flex h-[45px] items-start justify-between pt-1.5 text-sm text-subtle">
      {onBack ? (
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 font-semibold hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </button>
      ) : (
        <span />
      )}
      <span>
        STEP 0{step} <span className="sr-only">of 2</span>
      </span>
    </div>
  );
}

export function SignupForm({ defaultService, plan }: { defaultService: SignupService; plan?: string }) {
  const router = useRouter();
  const { signup } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [basics, setBasics] = useState<AccountBasics | null>(null);
  const [password, setPassword] = useState("");
  const [service, setService] = useState<SignupService>(defaultService);
  const [country, setCountry] = useState<string>(DIAL_CODES[0].country);
  const dial = DIAL_CODES.find((d) => d.country === country) ?? DIAL_CODES[0];

  const stepOne = useZodForm(
    signupSchema,
    async (data) => {
      setBasics(data);
      setStep(2);
    },
    { resetOnSuccess: false },
  );

  const stepTwo = useZodForm(
    signupDetailsSchema,
    async (details) => {
      if (!basics) return;
      const payload: SignupPayload = {
        ...basics,
        accountType: details.service === "pilot" ? "user" : "provider",
        company: details.company || undefined,
        country: details.country,
        phone: details.phone ? `${dial.dial} ${details.phone}` : undefined,
        service: details.service,
        plan,
      };
      try {
        const { email } = await signup(payload);
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } catch (err) {
        // Name / email / password problems belong to step 01 — send the user back there with them inline.
        const fields = err instanceof ApiError ? err.body.fieldErrors : undefined;
        const stepOneErrors = Object.fromEntries(Object.entries(fields ?? {}).filter(([k]) => STEP_ONE_FIELDS.has(k)));
        if (err instanceof ApiError && Object.keys(stepOneErrors).length > 0) {
          // A taken email comes back as a generic field message; the top-level one is clearer.
          if (stepOneErrors.email && err.status === 409) stepOneErrors.email = err.body.message;
          stepOne.setErrors(stepOneErrors);
          setStep(1);
          return;
        }
        throw err;
      }
    },
    { resetOnSuccess: false },
  );

  const heading = (
    <AuthHeading
      title="Join the network ✈️"
      subtitle={
        <>
          Create your free aviation account in 30 seconds
          {plan && (
            <span className="mt-2 flex w-fit items-center gap-1.5 rounded-full border border-brand/20 bg-brand/6 px-2.5 py-0.5 text-xs font-semibold text-brand">
              Selected plan: <span className="capitalize">{plan.replace(/[-_]/g, " ")}</span>
            </span>
          )}
        </>
      }
    />
  );

  return (
    <>
      {/* Step 01 stays mounted (hidden) so its values survive going back and forth. */}
      <form onSubmit={stepOne.handleSubmit} method="post" noValidate hidden={step !== 1} aria-label="Account details">
        <StepLabel step={1} />
        {heading}
        <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            autoComplete="given-name"
            placeholder="James"
            icon={<User className="size-[15px]" aria-hidden />}
            className={AUTH_INPUT}
            error={stepOne.errors.firstName}
            required
          />
          <Input
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            placeholder="Henderson"
            icon={<User className="size-[15px]" aria-hidden />}
            className={AUTH_INPUT}
            error={stepOne.errors.lastName}
            required
          />
        </div>
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="captain@airline.com"
          icon={<Mail className="size-4" aria-hidden />}
          className={AUTH_INPUT}
          wrapperClassName="pt-3.5"
          error={stepOne.errors.email}
          required
        />
        <div className="pt-3.5">
          <PasswordField
            label="Password"
            name="password"
            id="signup-password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={stepOne.errors.password}
            required
          />
          <PasswordStrengthMeter password={password} />
        </div>
        <Button type="submit" loading={stepOne.submitting} className={cn(AUTH_SUBMIT, "mt-[34px]")}>
          Next →
        </Button>
      </form>

      {step === 2 && (
        <form onSubmit={stepTwo.handleSubmit} noValidate aria-label="Profile details">
          <StepLabel step={2} onBack={() => setStep(1)} />
          {heading}

          <div className="flex gap-3 pt-4">
            <div className="relative shrink-0">
              <label htmlFor="country" className="sr-only">
                Country dialling code
              </label>
              <div
                aria-hidden
                className="flex h-[52px] items-center gap-3 rounded-xl border border-brand/20 bg-white pr-3 pl-2.5 text-[15px] text-subtle"
              >
                {dial.country === "IN" ? (
                  <Image src="/images/auth/flag-in.png" alt="" width={27} height={19} className="h-[19px] w-[27px] object-cover" />
                ) : (
                  <Flag code={dial.country} className="h-[19px] w-[27px]" />
                )}
                <span className="min-w-[34px]">{dial.dial}</span>
                <ChevronDown className="size-4" />
              </div>
              <select
                id="country"
                name="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {DIAL_CODES.map((d) => (
                  <option key={d.country} value={d.country}>
                    {d.name} ({d.dial})
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="phone" className="sr-only">
                Mobile number
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel-national"
                placeholder="Mobile number"
                className="h-[52px]! border-brand/20! text-[15px]!"
                error={stepTwo.errors.phone}
              />
            </div>
          </div>

          <fieldset className="pt-[31px]">
            <legend className="float-left mb-2 w-full text-xs font-semibold tracking-[0.6px] text-muted uppercase">Select services</legend>
            <div className="clear-both grid grid-cols-2 gap-2">
              {SIGNUP_SERVICES.map((s) => {
                const active = service === s.value;
                return (
                  <label
                    key={s.value}
                    className={cn(
                      "flex min-h-[37.5px] cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                      active ? "border-brand bg-[#eff6ff] text-brand" : "border-line bg-white text-muted hover:border-brand/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="service"
                      value={s.value}
                      checked={active}
                      onChange={() => setService(s.value)}
                      className="sr-only"
                    />
                    {s.emoji && <span aria-hidden>{s.emoji}</span>}
                    {s.label}
                  </label>
                );
              })}
            </div>
            <FieldError id="service-error" message={stepTwo.errors.service} />
          </fieldset>

          <div className="pt-[30px]">
            <Label htmlFor="company">
              Company name{service === "pilot" && <span className="font-normal normal-case tracking-normal text-subtle"> (optional)</span>}
            </Label>
            <Input
              id="company"
              name="company"
              autoComplete="organization"
              placeholder="Enter Company Name"
              className={AUTH_INPUT}
              error={stepTwo.errors.company}
              required={service !== "pilot"}
            />
          </div>

          {stepTwo.result.status === "error" && (
            <div className="mt-4">
              <FormStatus status="error" message={stepTwo.result.message} />
            </div>
          )}

          <Button type="submit" loading={stepTwo.submitting} className={cn(AUTH_SUBMIT, "mt-[34px]")}>
            Create Account →
          </Button>
        </form>
      )}

      <SocialButtons />
    </>
  );
}
