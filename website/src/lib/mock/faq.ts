import type { FaqItem } from "@/lib/types";

export const FAQ_CATEGORIES = [
  "Account & Registration",
  "Membership",
  "Aviation Directory",
  "Airport Search",
  "Service Providers",
  "Subscriptions",
  "Data Licence",
  "Advertisements",
  "Aviation Tools",
] as const;

export const FAQS: FaqItem[] = [
  { id: "faq-1", category: "Aviation Directory", question: "What is the Global Aviation Services Directory?", answer: "The Global Aviation Services Directory is the world's most comprehensive aviation services platform, listing 50,000+ verified providers — including FBOs, ground handlers, fuel suppliers, caterers, MRO facilities, charter operators, and more — across 180 countries and 12,000+ airports." },
  { id: "faq-2", category: "Airport Search", question: "How do I search for aviation services at a specific airport?", answer: "Enter an ICAO code (e.g. OMDB), IATA code (e.g. DXB), airport name or city in the search bar. The airport page lists every verified provider at that airport, grouped by service type, alongside weather, NOTAMs, runways and frequencies." },
  { id: "faq-3", category: "Aviation Directory", question: "Is the directory available worldwide?", answer: "Yes. We cover 180+ countries and more than 12,000 airports, from major international hubs to regional and private airfields." },
  { id: "faq-4", category: "Service Providers", question: "How accurate and up-to-date is the information?", answer: "Provider listings are verified by our data team and refreshed continuously. Verified providers confirm their details at least every 90 days, and weather/NOTAM data is pulled live from official sources." },
  { id: "faq-5", category: "Account & Registration", question: "Do I need an account to search the directory?", answer: "No. Searching and viewing provider profiles is free. An account lets you save favourites, send enquiries and receive NOTAM alerts for your airports." },
  { id: "faq-6", category: "Account & Registration", question: "How do I reset my password?", answer: "Use the 'Forgot password' link on the login page. We'll email you a secure one-time code to set a new password." },
  { id: "faq-7", category: "Membership", question: "What's the difference between Basic, Pro and Ultra Pro listings?", answer: "Basic listings include your contact details and services. Pro adds a gallery, brochures, certifications and priority placement. Ultra Pro adds featured placement, video, social links, sponsored ad slots and advanced analytics." },
  { id: "faq-8", category: "Membership", question: "Can I upgrade or downgrade my plan at any time?", answer: "Yes. Upgrades take effect immediately and are pro-rated. Downgrades apply at the end of the current billing period." },
  { id: "faq-9", category: "Service Providers", question: "How do I list my business?", answer: "Click 'Register as Provider', create an account and complete your company profile. Our team verifies new listings within two business days." },
  { id: "faq-10", category: "Subscriptions", question: "Which payment methods do you accept?", answer: "We accept all major credit and debit cards and bank transfer for annual enterprise plans. All payments are processed securely." },
  { id: "faq-11", category: "Subscriptions", question: "Is there a refund policy?", answer: "Yes — all paid plans come with a 14-day money-back guarantee. See our Refund Policy for details." },
  { id: "faq-12", category: "Data Licence", question: "Can I license your airport and provider data?", answer: "Yes. We offer enterprise data licences via API and bulk exports. Visit the Data Licence page to request access." },
  { id: "faq-13", category: "Advertisements", question: "How can I advertise on the platform?", answer: "We offer header banners, sponsored cards, airport-page ads and video placements. Visit the Advertise page to see formats and request a media kit." },
  { id: "faq-14", category: "Aviation Tools", question: "Where does the weather data come from?", answer: "METAR and TAF reports are sourced from official aviation weather services and refreshed every few minutes." },
  { id: "faq-15", category: "Aviation Tools", question: "Are the runway diagrams suitable for navigation?", answer: "No. Diagrams are for planning and reference only. Always use current official charts for navigation." },
];
