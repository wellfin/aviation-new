import type { LegalDoc } from "../types";

export type CookieCategoryId = "essential" | "analytics" | "functional" | "marketing";

export interface CookieCategory {
  id: CookieCategoryId;
  name: string;
  description: string;
  cookies: string[];
  /** Always on and cannot be switched off. */
  required?: boolean;
  /** Initial state before the visitor saves a choice. */
  defaultOn: boolean;
}

export const COOKIE_CATEGORIES: CookieCategory[] = [
  {
    id: "essential",
    name: "Essential Cookies",
    description: "These cookies are necessary for the website to function and cannot be disabled. They include session management, security, and core functionality.",
    cookies: ["session_id", "csrf_token", "auth_token"],
    required: true,
    defaultOn: true,
  },
  {
    id: "analytics",
    name: "Analytics Cookies",
    description: "These help us understand how visitors interact with the website. All data is anonymised and used to improve the user experience.",
    cookies: ["_ga", "_gid", "_gat"],
    defaultOn: true,
  },
  {
    id: "functional",
    name: "Functional Cookies",
    description: "These enable enhanced functionality such as remembering your preferences, search history, and favourite airports.",
    cookies: ["user_prefs", "recent_airports", "filter_state"],
    defaultOn: true,
  },
  {
    id: "marketing",
    name: "Marketing Cookies",
    description: "These are used to track visitors across websites to display relevant advertisements. They are placed by our advertising partners.",
    cookies: ["_fbp", "IDE", "NID"],
    defaultOn: false,
  },
];

export const COOKIES_POLICY: LegalDoc = {
  crumb: "Cookies Policy",
  title: "Cookies Policy",
  summary: "This policy explains what cookies we use, why we use them, and how you can manage your preferences.",
  updated: "Last updated: 1 September 2026",
  tocTitle: "Contents",
  numberedHeadings: false,
  lead: [
    {
      type: "banner",
      title: "Manage Your Cookie Preferences",
      text: "Customise which cookies you allow us to use. Essential cookies cannot be disabled as they are required for the site to work.",
      cta: { label: "Manage Preferences ↓", href: "#types-of-cookies" },
    },
  ],
  sections: [
    {
      id: "what-are-cookies",
      label: "What Are Cookies?",
      blocks: [
        {
          type: "p",
          text: "Cookies are small text files placed on your device when you visit a website. They serve many functions: keeping you logged in, remembering your preferences, and helping us understand how you use our platform.",
        },
        {
          type: "p",
          text: "Cookies are processed on the lawful basis of consent (for non-essential cookies) and legitimate interests / contract performance (for essential cookies) under GDPR Article 6.",
        },
      ],
    },
    {
      id: "types-of-cookies",
      label: "Types of Cookies We Use",
      blocks: [{ type: "cookie-manager" }],
    },
    {
      id: "managing-cookies",
      label: "Managing Cookies",
      heading: "Managing Cookies in Your Browser",
      blocks: [
        {
          type: "p",
          text: "Your choices above are stored on this device and apply each time you visit. You can change them at any time. Most browsers also let you view, block or delete cookies from their settings; blocking essential cookies will prevent sign-in and some features from working.",
        },
        {
          type: "p",
          text: "Session cookies are deleted when you close your browser. Persistent cookies remain for a set period — analytics cookies for up to 24 months and functional cookies for up to 12 months — unless you delete them sooner.",
        },
      ],
    },
    {
      id: "contact",
      label: "Contact",
      blocks: [
        {
          type: "p",
          text: [
            "For questions about our cookie usage, please contact ",
            { text: "privacy@gasdirectory.aero", href: "mailto:privacy@gasdirectory.aero" },
            " or see our ",
            { text: "Privacy Policy", href: "/legal/privacy" },
            " and ",
            { text: "GDPR page", href: "/legal/gdpr" },
            ".",
          ],
        },
      ],
    },
  ],
};
