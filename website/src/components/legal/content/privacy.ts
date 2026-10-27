import type { LegalDoc } from "../types";

export const PRIVACY_POLICY: LegalDoc = {
  crumb: "Privacy Policy",
  title: "Privacy Policy",
  summary: "Your privacy matters to us. This document outlines our policies regarding collecting, processing, and storing your personal data.",
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
          text: "Book My FBO strives to keep your personal information safe. The following Privacy Policy sets out the types of information we collect, how we process your data, who we share it with, and your rights regarding your data.",
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
        { type: "p", text: "You may update your account information at any time. Email address changes require re-verification." },
      ],
    },
    {
      id: "search-activity",
      label: "Search & Activity",
      heading: "Search and Activity Information",
      blocks: [
        {
          type: "p",
          text: "Your searches, pages you viewed, features used, and activity on the Platform are logged to enhance the Platform and customize your experience. The information is anonymized for aggregate analysis purposes.",
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
            "Cookies and other similar tracking technologies are used to maintain your login, save your preferences, and learn how the Platform is being used by you. You can change your preference at any time using the Cookie Preference Centre. For more information, refer to our ",
            { text: "Cookies Policy", href: "/legal/cookies" },
            ".",
          ],
        },
      ],
    },
    {
      id: "data-usage",
      label: "Use of Personal Information",
      blocks: [
        {
          type: "p",
          text: "Your personal information is used for the following purposes: to deliver and enhance our Platform, payment processing, transactional communication (receipts, security information), marketing communications (with your consent), compliance with legal requirements, and preventing fraudulent or abusive conduct.",
        },
      ],
    },
    {
      id: "data-sharing",
      label: "Data Sharing",
      blocks: [
        {
          type: "p",
          text: "We do not sell any personal information. We will only disclose personal information to verified service providers who enter into data processing agreements with us, such as cloud storage, payment processors, email delivery services, analytics services, and fraud prevention. No personal information is disclosed to any advertising networks without express consent.",
        },
      ],
    },
    {
      id: "data-retention",
      label: "Data Retention",
      blocks: [
        {
          type: "p",
          text: "Active account information is kept for the duration of your account plus 3 years. Payment information is kept for 7 years. Support communications are kept for 2 years. Anonymous analytics information is kept forever.",
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
            "You are entitled to certain rights regarding access, correction, erasure, restriction of processing, data portability, and objection to processing. For more information on these rights, see our ",
            { text: "GDPR page", href: "/legal/gdpr" },
            ".",
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
            "We use industry-standard security procedures including AES-256 encryption, TLS 1.3 encryption, multi-factor authentication, regular penetration testing, and round-the-clock security monitoring. There is no such thing as foolproof security; please notify us if you become aware of any security issues at ",
            { text: "info@bookmyfbo.com", href: "mailto:info@bookmyfbo.com" },
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
          text: ["For privacy queries, contact us at ", { text: "info@bookmyfbo.com", href: "mailto:info@bookmyfbo.com" }, "."],
        },
        { type: "cta", label: "Contact Privacy Team", href: "/contact" },
      ],
    },
  ],
};
