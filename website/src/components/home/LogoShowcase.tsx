import Image from "next/image";

interface Logo {
  name: string;
  src: string;
  width: number;
  height: number;
}

const PRIMEJET: Logo = { name: "PrimeJet", src: "/images/home/logo-primejet.png", width: 369, height: 45 };
const SHELTAIR: Logo = { name: "Sheltair", src: "/images/home/logo-sheltair.png", width: 319, height: 106 };
const NETFLIX: Logo = { name: "Netflix", src: "/images/home/logo-netflix.png", width: 261, height: 71 };
const KROGER: Logo = { name: "Kroger", src: "/images/home/logo-kroger.png", width: 288, height: 107 };
const SIGNATURE: Logo = { name: "Signature Aviation", src: "/images/home/logo-signature.png", width: 512, height: 178 };

const CLIENTS: Array<Logo & { h: string }> = [
  { ...PRIMEJET, h: "h-[20px] sm:h-[26px]" },
  { ...SHELTAIR, h: "h-[40px]" },
  { ...NETFLIX, h: "h-[34px]" },
  { ...KROGER, h: "h-[38px]" },
  { ...SIGNATURE, h: "h-[42px]" },
];

const FEATURED_IN: Array<Logo & { h: string }> = [
  { ...NETFLIX, h: "h-[32px]" },
  { ...SHELTAIR, h: "h-[38px]" },
  { ...PRIMEJET, h: "h-[20px]" },
  { ...KROGER, h: "h-[38px]" },
  { ...SIGNATURE, h: "h-[40px]" },
];

function RuledHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="flex items-center justify-center gap-3 text-[22px] font-semibold text-ink uppercase md:text-[26px]">
      <span className="h-px w-16 bg-navy-900 sm:w-[170px]" aria-hidden />
      {children}
      <span className="h-px w-16 bg-navy-900 sm:w-[170px]" aria-hidden />
    </h2>
  );
}

/**
 * Logos scrolling right to left without a seam: the track holds the list twice and slides by
 * one copy. Hovering pauses it; reduced-motion users see a still row. The copy is hidden from
 * assistive tech so each logo is announced once.
 */
function LogoMarquee({ logos, label, divided = false, duration }: { logos: Array<Logo & { h: string }>; label: string; divided?: boolean; duration: string }) {
  const copy = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} aria-label={hidden ? undefined : label} className={`flex shrink-0 items-center ${divided ? "divide-x divide-line" : ""}`}>
      {logos.map((l) => (
        <li key={l.name} className={`flex w-[180px] shrink-0 justify-center sm:w-[206px] ${divided ? "px-6" : "px-8"}`}>
          <Image src={l.src} alt={hidden ? "" : l.name} width={l.width} height={l.height} className={`${l.h} w-auto max-w-full object-contain`} />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused]" style={{ ["--marquee-duration" as string]: duration }}>
        {copy(false)}
        {copy(true)}
      </div>
    </div>
  );
}

/** "Our Clients" logo bar and "Featured In" press row, both scrolling right to left. */
export function LogoShowcase() {
  return (
    <div className="bg-white py-16 md:pt-[100px] md:pb-[100px]">
      <section aria-labelledby="clients-heading" className="container-site">
        <RuledHeading id="clients-heading">Our Clients</RuledHeading>
        <div className="mx-auto mt-4 max-w-[1032px] rounded-[16px] border border-line/70 bg-white py-7">
          <LogoMarquee logos={CLIENTS} label="Our clients" divided duration="28s" />
        </div>
      </section>
      <section aria-labelledby="featured-in-heading" className="container-site mt-16 md:mt-[112px]">
        <RuledHeading id="featured-in-heading">Featured In</RuledHeading>
        <div className="mx-auto mt-6 max-w-[1015px]">
          <LogoMarquee logos={FEATURED_IN} label="Featured in" duration="32s" />
        </div>
      </section>
    </div>
  );
}
