import Image from "next/image";
import Link from "next/link";
import { Headset } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AdMarker } from "./HomeAdColumn";

const BLUE = "bg-[#eff6ff] border-[#dbeafe]";
const AMBER = "bg-warning/8 border-warning/19";

const svgIcon = (src: string) => <Image src={src} alt="" width={20} height={20} />;

const FEATURES: Array<{ title: string; body: string; href: string; icon: ReactNode; tone: string }> = [
  { title: "Airport Data", body: "Essential airport information for smarter flight planning.", href: "/airports", icon: svgIcon("/images/shared/ico-weather.svg"), tone: BLUE },
  { title: "FBO Information", body: "Find detailed FBO facilities and services.", href: "/directory?category=fbo", icon: svgIcon("/images/shared/ico-notam.svg"), tone: AMBER },
  { title: "Aviation Services", body: "Access essential services for seamless operations.", href: "/directory", icon: <Headset className="size-5 text-brand" strokeWidth={1.75} />, tone: BLUE },
  { title: "Weather", body: "Real-time weather insights for safer planning.", href: "/tools/weather", icon: svgIcon("/images/shared/ico-weather.svg"), tone: BLUE },
  { title: "NOTAMs", body: "Stay updated on critical operational notices.", href: "/tools/notams", icon: svgIcon("/images/shared/ico-notam.svg"), tone: AMBER },
  { title: "Distance Calculator", body: "Calculate accurate distances between airports", href: "/tools/distance", icon: svgIcon("/images/shared/ico-nearby.svg"), tone: BLUE },
];

/** "Trusted by Leaders in Private Aviation" feature block, followed by the Signature Aviation display ad. */
export function TrustedSection() {
  return (
    <>
      <section aria-labelledby="trusted-heading" className="relative isolate mt-8 overflow-hidden rounded-[35px] bg-[#eaf3ff] px-4 py-10 sm:px-[25px] md:py-[50px] lg:mt-[45px]">
        <Image src="/images/home/trusted-bg.jpg" alt="" fill sizes="1032px" className="-z-10 object-cover opacity-10" />
        <h2 id="trusted-heading" className="mx-auto max-w-[658px] text-center font-inter text-[38px] leading-[44px] font-extrabold tracking-[-1.5px] text-[#0f172a] md:text-[60px] md:leading-[65px]">
          Trusted by Leaders in <span className="text-[#1a56db]">Private Aviation</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[680px] text-center font-inter text-base leading-7 text-[#4b5563] md:text-xl">
          Book My FBO delivers accurate, real-time, and comprehensive aviation information to help you make informed operational decisions.
        </p>
        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-6">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <Link
                href={f.href}
                className="flex h-full min-h-[215px] flex-col items-center gap-3 rounded-[15px] bg-white px-2.5 py-[25px] text-center font-inter transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className={cn("mb-2 flex size-12 items-center justify-center rounded-full border drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]", f.tone)} aria-hidden>
                  {f.icon}
                </span>
                <span className="min-h-10 max-w-[110px] text-sm leading-5 font-bold text-[#111827]">{f.title}</span>
                <span className="text-xs leading-[15px] text-[#6b7280]">{f.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <figure className="relative mt-2 h-[160px] overflow-hidden rounded-[14px] border-[1.5px] border-white/12 bg-navy-900 shadow-[0_2px_12px_rgba(0,0,0,0.15)] sm:h-[218px] lg:mx-[-1px]">
        <Image
          src="/images/home/ad-signature-jet.jpg"
          alt="Signature Aviation advertisement — business jet on the ramp"
          fill
          sizes="(max-width: 1024px) 100vw, 1033px"
          className="object-cover object-[50%_55%]"
        />
        <AdMarker className="top-2 right-2.5" />
      </figure>
    </>
  );
}
