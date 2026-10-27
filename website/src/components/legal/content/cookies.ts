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
  summary: "This document outlines the types of cookies used, the purposes behind the usage of those cookies, and ways of managing the cookies.",
  updated: "Last updated: 1 September 2026",
  tocTitle: "Contents",
  numberedHeadings: false,
  lead: [
    {
      type: "banner",
      title: "Manage Your Cookie Preferences",
      text: "Customize the types of cookies used by the company. It is not possible to disable essential cookies since these cookies are needed for the operation of the website.",
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
          text: "Cookies are small text files placed on your computer when visiting a website. They have several uses, including keeping you logged in, saving your preferences, and understanding how you interact with the website.",
        },
        {
          type: "p",
          text: "Cookies are processed on the lawful basis of consent (for non-essential cookies) and legitimate interests/contract performance (for essential cookies) under GDPR Article 6.",
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
      label: "Manage Cookies",
      heading: "Manage Cookies in Your Browser",
      blocks: [
        {
          type: "p",
          text: "The selections you make above are stored in your browser on this device and will apply each time you access the site. These settings can be altered at any time. Browsers usually also allow you to inspect, block, or delete cookies via the browser settings; blocking essential cookies will render sign-on and other functionalities unavailable.",
        },
        {
          type: "p",
          text: "Session cookies will expire once your browser is closed, whereas persistent cookies will exist for a specified amount of time – analytics cookies for up to 24 months and functional cookies for up to 12 months, unless deleted sooner.",
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
            "For any inquiries regarding cookies and how we use them, please get in touch with us via ",
            { text: "info@bookmyfbo.com", href: "mailto:info@bookmyfbo.com" },
            ".",
          ],
        },
      ],
    },
  ],
};
