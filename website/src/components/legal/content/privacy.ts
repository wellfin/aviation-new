import type { LegalDoc } from "../types";

export const PRIVACY_POLICY: LegalDoc = {
  crumb: "Privacy Policy",
  title: "Privacy Policy",
  summary: "Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.",
  updated: "Last updated: 1 September 2026",
  tocTitle: "Sections",
  numberedHeadings: true,
  tocFooter: { label: "View GDPR Rights →", href: "/legal/gdpr" },
  sections: [
    {
      id: "introduction",
      label: "Introduction",
      blocks: [
        {
          type: "p",
          text: 'Global Aviation Services Directory Ltd ("we", "our", "us") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, who we share it with, and your rights regarding that data.',
        },
        {
          type: "p",
          text: [
            "This policy applies to all users of gasdirectory.aero and related subdomains. If you have questions, contact our Privacy Team at ",
            { text: "privacy@gasdirectory.aero", href: "mailto:privacy@gasdirectory.aero" },
            ".",
          ],
        },
      ],
    },
    {
      id: "information-collected",
      label: "Information Collected",
      blocks: [
        { type: "p", text: "We collect information you provide directly, information collected automatically, and information from third parties." },
        {
          type: "cards",
          columns: 3,
          items: [
            { title: "Directly Provided", items: ["Name & email", "Password (hashed)", "Payment details", "Profile information", "Support communications"] },
            { title: "Automatically Collected", items: ["IP address", "Browser & device", "Pages visited", "Search queries", "Session duration"] },
            { title: "From Third Parties", items: ["Social login (OAuth)", "Payment processors", "Analytics providers", "Fraud prevention", "Public aviation databases"] },
          ],
        },
      ],
    },
    {
      id: "account-information",
      label: "Account Information",
      blocks: [
        {
          type: "p",
          text: "When you create an account, we collect your name, email address, password (stored as a secure hash), account type, and subscription details. This information is used to authenticate you, deliver services, and communicate regarding your account.",
        },
        { type: "p", text: "You may update your account information at any time via Account Settings. Email address changes require re-verification." },
      ],
    },
    {
      id: "search-activity",
      label: "Search & Activity",
      heading: "Search & Activity Information",
      blocks: [
        {
          type: "p",
          text: "We log your search queries, pages viewed, features used, and interaction patterns to improve the Platform and personalise your experience. This data is anonymised for aggregate analytics purposes. You may disable personalisation from Account Settings → Privacy.",
        },
      ],
    },
    {
      id: "cookies",
      label: "Cookies",
      blocks: [
        {
          type: "p",
          text: [
            "We use cookies and similar tracking technologies to keep you signed in, remember your preferences and understand how the Platform is used. You can manage your preferences at any time via the Cookie Preference Centre. Full details are in our ",
            { text: "Cookies Policy", href: "/legal/cookies" },
            ".",
          ],
        },
      ],
    },
    {
      id: "data-usage",
      label: "Data Usage",
      blocks: [
        {
          type: "p",
          text: "We use your personal data to: provide and improve the Platform, process payments, send transactional communications (receipts, security alerts), send marketing communications (with your consent), comply with legal obligations, and prevent fraud and abuse.",
        },
      ],
    },
    {
      id: "data-sharing",
      label: "Data Sharing",
      blocks: [
        {
          type: "p",
          text: "We do not sell personal data. We share data only with verified service providers under data processing agreements: cloud infrastructure, payment processors, email delivery, analytics, and fraud prevention. No data is shared with advertising networks without explicit consent.",
        },
      ],
    },
    {
      id: "data-retention",
      label: "Data Retention",
      blocks: [
        {
          type: "p",
          text: "Active account data is retained for the duration of your account plus 3 years. Payment records are retained for 7 years. Support communications are retained for 2 years. Anonymised analytics data is retained indefinitely. You may request deletion of your personal data subject to legal retention requirements.",
        },
      ],
    },
    {
      id: "your-rights",
      label: "Your Rights",
      blocks: [
        {
          type: "p",
          text: [
            "Under GDPR and UK data protection law, you have rights to access, rectify, erase, restrict, and port your data, and to object to processing. See our ",
            { text: "GDPR page", href: "/legal/gdpr" },
            " for full details on exercising these rights.",
          ],
        },
      ],
    },
    {
      id: "security",
      label: "Security",
      blocks: [
        {
          type: "p",
          text: [
            "We employ industry-standard security measures including AES-256 encryption at rest, TLS 1.3 in transit, multi-factor authentication, regular penetration testing, and 24/7 security monitoring. No security measure is 100% effective; please report any suspected security vulnerabilities to ",
            { text: "security@gasdirectory.aero", href: "mailto:security@gasdirectory.aero" },
            ".",
          ],
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
            "For privacy enquiries: ",
            { text: "privacy@gasdirectory.aero", href: "mailto:privacy@gasdirectory.aero" },
            " | Data Protection Officer: ",
            { text: "dpo@gasdirectory.aero", href: "mailto:dpo@gasdirectory.aero" },
          ],
        },
        { type: "cta", label: "Contact Privacy Team", href: "/contact" },
      ],
    },
  ],
};
