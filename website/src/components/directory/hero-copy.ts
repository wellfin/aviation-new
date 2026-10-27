/** Directory hero title and subtitle: one for All Services, one per design category. */
export interface HeroCopy {
  title: string;
  subtitle: string;
}

export const ALL_SERVICES_COPY: HeroCopy = {
  title: "Book My FBO Services Directory",
  subtitle: "Browse 50,000+ verified aviation service providers across 180+ countries.",
};

export const CATEGORY_COPY: Record<string, HeroCopy> = {
  fbo: {
    title: "Fixed Base Operators Services Directory",
    subtitle: "Find verified Fixed Base Operators for ground services & passenger facilities worldwide.",
  },
  "ground-handler": {
    title: "Ground Handling Services Directory",
    subtitle: "Find verified ground handling providers for aircraft handling & airport operations worldwide.",
  },
  "trip-support": {
    title: "Trip Support Services Directory",
    subtitle: "Discover trusted trip support providers for flight planning & aviation operations worldwide.",
  },
  permit: {
    title: "Flight Permit Services Directory",
    subtitle: "Connect with flight permit specialists for overflight & landing flight permits worldwide.",
  },
  fuel: {
    title: "Aviation Fuel Services Directory",
    subtitle: "Find verified aviation fuel providers offering refuelling services & fuel coordination worldwide.",
  },
  catering: {
    title: "In-Flight Catering Services Directory",
    subtitle: "Discover catering providers for customised onboard meals for private aviation worldwide.",
  },
  "ground-transportation": {
    title: "Ground Transportation Services Directory",
    subtitle: "Find ground transportation providers for executive transfers, crew transport & airport pickups worldwide.",
  },
  "charter-operator": {
    title: "Charter Operator Services Directory",
    subtitle: "Explore charter operators offering private aircraft & tailored air charter solutions worldwide.",
  },
  "supervisory-agent": {
    title: "Supervisory Agent Services Directory",
    subtitle: "Find supervisory agents coordinating ground services & overseeing aircraft operations globally.",
  },
  "meet-and-assist": {
    title: "Meet and Assist Services Directory",
    subtitle: "Discover passenger assistance providers offering personalised airport support around the world.",
  },
  "charter-broker": {
    title: "Charter Broker Services Directory",
    subtitle: "Connect with charter brokers to explore private aircraft for business & leisure travel worldwide.",
  },
  hotels: {
    title: "Hotel Services Directory",
    subtitle: "Discover hotels for aviation crews, passengers & business travellers near airports worldwide.",
  },
  mro: {
    title: "MRO Services Directory",
    subtitle: "Discover aircraft maintenance & overhaul providers for aviation safety & operations worldwide.",
  },
  "other-services": {
    title: "Other Aviation Services Directory",
    subtitle: "Find specialised aviation service providers offering operational and travel solutions worldwide.",
  },
};

/** Copy for the selected category, falling back to the All Services text. */
export function heroCopy(category: string): HeroCopy {
  return CATEGORY_COPY[category] ?? ALL_SERVICES_COPY;
}
