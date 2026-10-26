"use client";

import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormResultStatus } from "@/components/forms/FormResultStatus";
import { FieldError, FormStatus, Input, Label, Textarea } from "@/components/ui/Field";
import { apiPost } from "@/lib/api/client";
import { useZodForm } from "@/lib/hooks/useZodForm";
import type { FleetAircraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog } from "../Dialog";
import { DialCodeSelect } from "@/components/contact/DialCodeSelect";
import { EmailOtp, ENQUIRY_OTP, ENQUIRY_OTP_LENGTH } from "@/components/contact/EmailOtp";
import { useEmailVerification } from "@/components/contact/useEmailVerification";
import { useAuth } from "@/lib/auth/auth-context";
import { fleetEnquirySchema } from "../schema";
import { CARD_TITLE } from "../styles";
import { minToday } from "@/lib/dates";

const TRIP_TYPES = [
  { value: "one-way", label: "One Way" },
  { value: "round-trip", label: "Round Trip" },
  { value: "multi-leg", label: "Multi Leg" },
] as const;

function Step({ n, children }: { n: number; children: string }) {
  return (
    <h3 className="flex items-center gap-2.5 text-base font-bold text-ink">
      <span className="flex size-6 items-center justify-center rounded-md bg-brand/10 text-xs font-bold text-brand">{n}</span>
      {children}
    </h3>
  );
}

function FleetEnquiryForm({ providerSlug, aircraft, onDone }: { providerSlug: string; aircraft: FleetAircraft; onDone: () => void }) {
  const [trip, setTrip] = useState<(typeof TRIP_TYPES)[number]["value"]>("one-way");
  const [pax, setPax] = useState(2);
  // Outbound airports, and the return leg's (filled with them reversed until edited by hand).
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [returnFrom, setReturnFrom] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const roundTrip = trip === "round-trip";
  const otp = useEmailVerification();
  const { user } = useAuth();
  const { errors, submitting, result, handleSubmit } = useZodForm(
    fleetEnquirySchema,
    async (data) => {
      await otp.submitVerified(data.email, () => apiPost("/enquiries", data));
      return `Thanks — your ${aircraft.model} enquiry has been sent. The operator will reply with availability and a quote.`;
    },
    { resetOnSuccess: false },
  );

  if (result.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormStatus status="success" message={result.message} />
        <Button type="button" variant="outline" onClick={onDone} className="self-end">
          Close
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="providerSlug" value={providerSlug} />
      <input type="hidden" name="aircraftId" value={aircraft.id} />
      <input type="hidden" name="tripType" value={trip} />
      {/* The aircraft being enquired about (Figma: photo + model chip at the top). */}
      <div className="flex items-center gap-3 rounded-xl bg-brand/5 p-3">
        <span className="relative h-9 w-14 shrink-0 overflow-hidden rounded-lg bg-navy-900">
          <Image src={aircraft.image} alt="" fill sizes="56px" className="object-cover" />
        </span>
        <span className="text-sm font-bold text-ink">{aircraft.model}</span>
      </div>
      <Step n={1}>Trip Details</Step>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Trip type">
        {TRIP_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={trip === t.value}
            onClick={() => setTrip(t.value)}
            className={cn("h-8 rounded-lg px-3.5 text-[13px] font-semibold transition", trip === t.value ? "bg-brand-gradient text-white" : "bg-brand/8 text-brand hover:bg-brand/15")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Departure Airport *" name="from" id="fe-from" placeholder="e.g. EGLL / Heathrow" value={from} onChange={(e) => setFrom(e.target.value)} error={errors.from} />
        <Input label="Destination Airport *" name="to" id="fe-to" placeholder="e.g. OMDB / Dubai" value={to} onChange={(e) => setTo(e.target.value)} error={errors.to} />
        <Input label="Departure Date *" name="date" id="fe-date" type="date" ref={minToday} error={errors.date} />
        <Input label="Departure Time" name="time" id="fe-time" type="time" error={errors.time} />
      </div>
      {roundTrip && from.trim() !== "" && to.trim() !== "" && (
        // Round trip, once both airports are entered: the way back, from the destination to the departure airport unless changed.
        <fieldset className="rounded-xl border border-brand/15 bg-brand/4 p-4">
          <legend className="px-1 text-xs font-bold tracking-[0.6px] text-brand uppercase">Return</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Return From"
              name="returnFrom"
              id="fe-return-from"
              placeholder="Destination airport"
              value={returnFrom ?? to}
              onChange={(e) => setReturnFrom(e.target.value)}
              error={errors.returnFrom}
            />
            <Input
              label="Return To"
              name="returnTo"
              id="fe-return-to"
              placeholder="Departure airport"
              value={returnTo ?? from}
              onChange={(e) => setReturnTo(e.target.value)}
              error={errors.returnTo}
            />
            <Input label="Return Date *" name="returnDate" id="fe-return-date" type="date" ref={minToday} error={errors.returnDate} />
            <Input label="Return Time" name="returnTime" id="fe-return-time" type="time" error={errors.returnTime} />
          </div>
        </fieldset>
      )}
      <div>
        <Label htmlFor="fe-pax">Passengers</Label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPax((p) => Math.max(1, p - 1))} aria-label="Fewer passengers" className="flex size-8 items-center justify-center rounded-lg bg-brand/8 text-brand hover:bg-brand/15">
            <Minus className="size-3.5" />
          </button>
          <input
            id="fe-pax"
            name="passengers"
            inputMode="numeric"
            value={pax}
            onChange={(e) => setPax(Math.min(aircraft.seats, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)))}
            className="h-8 w-14 rounded-lg border border-line text-center text-sm font-bold text-ink outline-none focus:border-brand"
          />
          <button type="button" onClick={() => setPax((p) => Math.min(aircraft.seats, p + 1))} aria-label="More passengers" className="flex size-8 items-center justify-center rounded-lg bg-brand/8 text-brand hover:bg-brand/15">
            <Plus className="size-3.5" />
          </button>
          <span className="text-xs text-subtle">max {aircraft.seats} seats</span>
        </div>
        <FieldError id="fe-pax-error" message={errors.passengers} />
      </div>

      <hr className="border-line" />
      <Step n={2}>Customer Contact Information</Step>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full Name *" name="name" id="fe-name" placeholder="James Anderson" autoComplete="name" error={errors.name} />
        <Input label="Company Name" name="company" id="fe-company" placeholder="Optional" autoComplete="organization" error={errors.company} />
      </div>
      <div>
        <Label htmlFor="fe-email">Email Address *</Label>
        <EmailOtp
          key={otp.mountKey}
          {...otp.fieldProps}
          endpoints={ENQUIRY_OTP}
          id="fe-email"
          error={errors.email}
          trustedEmail={user?.emailVerified ? user.email : undefined}
          placeholder="your@email.com"
          layout="panel"
          codeLength={ENQUIRY_OTP_LENGTH}
          allowPersonal
        />
      </div>
      <div>
        <Label htmlFor="fe-phone">Phone Number</Label>
        <div className="flex gap-3">
          <DialCodeSelect id="fe-dial" className="h-12" />
          <Input name="phone" id="fe-phone" type="tel" placeholder="7946 0000" autoComplete="tel-national" wrapperClassName="min-w-0 flex-1" error={errors.phone} />
        </div>
      </div>
      <Textarea
        label="Description / Additional Requirements"
        name="message"
        id="fe-message"
        rows={4}
        placeholder="Please describe your requirements, preferred cabin configuration, catering needs, or any other special requests..."
        error={errors.message}
      />
      {result.status === "error" && <FormResultStatus result={result} />}
      {/* Figma: a wide Submit button with Cancel beside it. */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" loading={submitting} className="sm:flex-1">
          Submit Enquiry →
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function FleetTab({
  fleet,
  providerSlug,
  providerName,
  acceptsEnquiries,
}: {
  fleet: FleetAircraft[];
  providerSlug: string;
  providerName: string;
  /** Only Pro / Ultra Pro listings receive enquiries (the API rejects the rest). */
  acceptsEnquiries: boolean;
}) {
  const [enquire, setEnquire] = useState<FleetAircraft | null>(null);

  return (
    <section aria-labelledby="fleet-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="fleet-heading" className={CARD_TITLE}>
          Aircraft Fleet
        </h2>
        <span className="rounded-full bg-brand-cyan/15 px-2.5 py-1 text-[11px] font-bold tracking-[0.5px] text-[#0891b2] uppercase">
          {fleet.length} aircraft
        </span>
      </div>
      {fleet.length === 0 ? (
        <p className="mt-4 rounded-[20px] bg-white p-6 text-sm text-muted shadow-soft">{providerName} hasn&apos;t listed any aircraft yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-6">
          {fleet.map((a) => {
            const stats = [
              { label: "Aircraft Type", value: a.model },
              { label: "Base", value: a.baseIcao },
              { label: "Category", value: a.category },
              { label: "Seats", value: String(a.seats) },
              { label: "YOM", value: String(a.yearOfManufacture) },
              { label: "YOR", value: a.yearOfRefurbishment ? String(a.yearOfRefurbishment) : "—" },
            ];
            return (
              <li key={a.id} className="overflow-hidden rounded-[20px] bg-white shadow-[0_4px_24px_rgba(11,31,58,0.08),0_1px_4px_rgba(11,31,58,0.04)]">
                <div className="relative h-[180px] md:h-[226px]">
                  <Image src={a.image} alt={a.model} fill sizes="(max-width: 1024px) 100vw, 891px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-5 text-white">
                    <p className="text-lg leading-7 font-extrabold">{a.model}</p>
                    <p className="text-sm opacity-75">{a.category}</p>
                  </div>
                </div>
                <div className="p-5">
                  <dl className="grid grid-cols-2 gap-3 pt-4 pb-5 sm:grid-cols-3">
                    {stats.map((s) => (
                      <div key={s.label} className="rounded-xl border border-brand/10 bg-brand/5 p-3 text-center">
                        <dt className="text-base font-black text-ink">{s.label}</dt>
                        <dd className="mt-0.5 text-xs text-subtle">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {acceptsEnquiries ? (
                    <button type="button" onClick={() => setEnquire(a)} aria-haspopup="dialog" className="bg-brand-gradient h-12 w-full rounded-xl text-[15px] font-bold text-white transition hover:brightness-110">
                      Enquire Now →
                    </button>
                  ) : (
                    <p className="rounded-xl bg-surface px-4 py-3 text-center text-sm text-muted">Contact {providerName} directly using the details above for availability and quotes.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={enquire !== null} onClose={() => setEnquire(null)} title="Aircraft Fleet Enquiry" subtitle={providerName} className="max-w-[600px]">
        {enquire && <FleetEnquiryForm key={enquire.id} providerSlug={providerSlug} aircraft={enquire} onDone={() => setEnquire(null)} />}
      </Dialog>
    </section>
  );
}
