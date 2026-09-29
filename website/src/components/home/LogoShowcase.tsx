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

/** "Our Clients" logo bar and "Featured In" press row. */
export function LogoShowcase() {
  return (
    <div className="bg-white py-16 md:pt-[100px] md:pb-[100px]">
      <section aria-labelledby="clients-heading" className="container-site">
        <RuledHeading id="clients-heading">Our Clients</RuledHeading>
        <ul className="mx-auto mt-4 grid max-w-[1032px] grid-cols-2 items-center gap-6 rounded-[16px] border border-line/70 bg-white px-6 py-7 sm:grid-cols-3 md:flex md:justify-between md:divide-x md:divide-line md:gap-0 md:px-0">
          {CLIENTS.map((l) => (
            <li key={l.name} className="flex flex-1 justify-center md:px-6">
              <Image src={l.src} alt={l.name} width={l.width} height={l.height} className={`${l.h} w-auto max-w-full object-contain`} />
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="featured-in-heading" className="container-site mt-16 md:mt-[112px]">
        <RuledHeading id="featured-in-heading">Featured In</RuledHeading>
        <ul className="mx-auto mt-6 flex max-w-[1015px] flex-wrap items-center justify-center gap-x-12 gap-y-6 md:justify-between md:gap-x-6">
          {FEATURED_IN.map((l) => (
            <li key={l.name}>
              <Image src={l.src} alt={l.name} width={l.width} height={l.height} className={`${l.h} w-auto object-contain`} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
