import type { Metadata } from "next";
import Image from "next/image";
import { DemoRequestForm } from "@/components/company/DemoRequestForm";
import { PageHero, PageShell } from "@/components/company/PageShell";

export const metadata: Metadata = {
  title: "Request Your Demo",
  description:
    "Request a personalized 30-minute demo of Book My FBO from one of our aviation experts — provider search, aviation tools, analytics and the data licence API — tailored to your unique needs.",
};

const INCLUDED = [
  { emoji: "🗺️", title: "50,000+ Providers Verified", text: "Live walkthrough of the complete global directory" },
  { emoji: "⚡", title: "Aviation Solutions Live", text: "Demo of weather, NOTAM, runways, and trip planning services" },
  { emoji: "📊", title: "Analytics Dashboard", text: "Real-time provider analytics and market intelligence" },
  { emoji: "🔗", title: "API Integration", text: "Technical overview of the Data Licence & API integration process" },
  { emoji: "🛡️", title: "Enterprise Security", text: "GDPR compliance and security posture demo" },
  { emoji: "🎯", title: "Customized Demo", text: "Tailored demo of aviation solutions tailored to your unique use case" },
] as const;

export default function RequestDemoPage() {
  return (
    <PageShell
      hero={
        <PageHero
          title="Request Your Demo"
          subtitle="Request a personalized 30-minute demo from one of our aviation experts. We will conduct the demo as per your unique needs."
          subtitleClassName="max-w-[480px]"
          crumbs={[{ label: "Home", href: "/" }, { label: "Company", href: "/about" }, { label: "Request Demo" }]}
        />
      }
    >
      <div className="mx-auto grid max-w-[1200px] items-start gap-10 px-4 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="relative aspect-[552/224] overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(11,31,58,0.15)]">
            <Image src="/images/company/demo-jet.jpg" alt="Business jet parked on the apron with airstair deployed" fill priority sizes="(max-width: 1024px) 100vw, 552px" className="object-cover" />
          </div>
          <h2 className="mt-10 text-xl font-bold text-ink">What&rsquo;s Included in the Demo</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <li key={item.title} className="flex gap-3 rounded-xl border border-line bg-white p-4">
                <span className="text-xl leading-6" aria-hidden>
                  {item.emoji}
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{item.title}</span>
                  <span className="mt-1 block text-[13px] leading-5 text-muted">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <section aria-labelledby="demo-form-heading" className="rounded-3xl border border-line/60 bg-white p-6 shadow-card sm:p-8">
          <h2 id="demo-form-heading" className="mb-6 text-xl font-bold text-ink">
            Request Your Demo
          </h2>
          <DemoRequestForm />
        </section>
      </div>
    </PageShell>
  );
}
