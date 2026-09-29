import type { Metadata } from "next";
import Image from "next/image";
import { DemoRequestForm } from "@/components/company/DemoRequestForm";
import { PageHero, PageShell } from "@/components/company/PageShell";

export const metadata: Metadata = {
  title: "Request Your Demo",
  description:
    "Book a personalised 30-minute demonstration of the Global Aviation Services Directory — provider search, aviation tools, analytics and the data licence API — tailored to your operation.",
};

const INCLUDED = [
  { emoji: "🗺️", title: "50,000+ Verified Providers", text: "Live walkthrough of the complete global directory" },
  { emoji: "⚡", title: "Aviation Tools in Action", text: "Weather, NOTAMs, runway diagrams, and trip planning demonstrated" },
  { emoji: "📊", title: "Analytics Dashboard", text: "See real-time provider analytics and market insights" },
  { emoji: "🔗", title: "API Integration", text: "Technical overview of data licence and API endpoints" },
  { emoji: "🛡️", title: "Enterprise Security", text: "Compliance, GDPR, and security posture explained" },
  { emoji: "🎯", title: "Custom Setup", text: "Tailored demo focusing on your specific use case" },
] as const;

export default function RequestDemoPage() {
  return (
    <PageShell
      hero={
        <PageHero
          title="Request Your Demo"
          subtitle="Request a personalised 30-minute demonstration with one of our aviation specialists. We'll tailor the session to your specific requirements."
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
