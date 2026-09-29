import type { LegalDoc } from "../types";

export const GDPR_COMPLIANCE: LegalDoc = {
  crumb: "GDPR",
  title: "GDPR Compliance",
  summary:
    "Global Aviation Services Directory is committed to protecting your personal data and complying fully with the General Data Protection Regulation (GDPR).",
  updated: "Last updated: 1 September 2026",
  badge: "GDPR Compliant",
  tocTitle: "Contents",
  numberedHeadings: false,
  sections: [
    {
      id: "overview",
      label: "Overview",
      blocks: [
        {
          type: "p",
          text: "The General Data Protection Regulation (GDPR) is a regulation in EU law on data protection and privacy for all individuals within the European Union and the European Economic Area. It also addresses the transfer of personal data outside the EU and EEA areas.",
        },
        {
          type: "p",
          text: 'Global Aviation Services Directory ("we", "our", "us") acts as both a Data Controller (for user account and registration data) and a Data Processor (for provider listing data submitted by business customers). This page explains your rights and our obligations under GDPR.',
        },
        {
          type: "p",
          text: ["Our Data Protection Officer can be contacted at ", { text: "dpo@gasdirectory.aero", href: "mailto:dpo@gasdirectory.aero" }, " for any GDPR-related enquiries."],
        },
      ],
    },
    {
      id: "your-rights",
      label: "Your Rights",
      blocks: [
        {
          type: "checks",
          items: [
            { title: "Right to Access", text: "You have the right to request a copy of all personal data we hold about you at any time." },
            { title: "Right to Rectification", text: "You may request correction of any inaccurate or incomplete personal data we hold." },
            { title: "Right to Erasure (“Right to be Forgotten”)", text: "You may request deletion of your personal data subject to certain legal conditions." },
            { title: "Right to Restriction", text: "You may request that we restrict the processing of your personal data in certain circumstances." },
            { title: "Right to Data Portability", text: "You have the right to receive your personal data in a structured, machine-readable format." },
            { title: "Right to Object", text: "You have the right to object to processing of your data for marketing or profiling purposes." },
            { title: "Right to Withdraw Consent", text: "Where processing is based on consent, you may withdraw it at any time without affecting lawfulness of prior processing." },
          ],
        },
        {
          type: "p",
          text: [
            "To exercise any of these rights, please submit a Subject Access Request (SAR) via your account settings or email ",
            { text: "dpo@gasdirectory.aero", href: "mailto:dpo@gasdirectory.aero" },
            ". We will respond within 30 days.",
          ],
        },
      ],
    },
    {
      id: "data-we-collect",
      label: "Data We Collect",
      blocks: [
        { type: "p", text: "We collect only the data necessary to provide our services. Categories of data include:" },
        {
          type: "list",
          items: [
            "Identity data (name, username)",
            "Contact data (email address, phone number)",
            "Account data (password hash, preferences, subscription tier)",
            "Usage data (pages visited, features used, session duration)",
            "Technical data (IP address, browser type, device identifiers)",
            "Payment data (processed by Stripe — we do not store card numbers)",
            "Communication data (support tickets, enquiry forms)",
          ],
        },
      ],
    },
    {
      id: "data-processing",
      label: "Data Processing",
      blocks: [
        { type: "p", text: "We process your personal data on the following lawful bases under Article 6 GDPR:" },
        {
          type: "cards",
          columns: 2,
          items: [
            { title: "Contract Performance", text: "Delivering subscription services, managing your account" },
            { title: "Legitimate Interests", text: "Fraud prevention, service improvement, security monitoring" },
            { title: "Legal Obligation", text: "Tax, accounting, anti-money laundering compliance" },
            { title: "Consent", text: "Marketing communications, non-essential cookies, data sharing with partners" },
          ],
        },
      ],
    },
    {
      id: "data-storage",
      label: "Data Storage",
      blocks: [
        {
          type: "p",
          text: "Your data is stored on servers located within the European Economic Area (EEA), primarily in the United Kingdom and Ireland. All data at rest is encrypted using AES-256. Data in transit is protected using TLS 1.3.",
        },
        {
          type: "p",
          text: "We retain personal data only as long as necessary for the purpose it was collected, or as required by law. Typical retention periods: active account data — duration of account plus 3 years; payment records — 7 years (legal requirement); support communications — 2 years; anonymised analytics — indefinite.",
        },
      ],
    },
    {
      id: "data-sharing",
      label: "Data Sharing",
      blocks: [
        {
          type: "p",
          text: "We do not sell your personal data. We share data only with trusted service providers under strict data processing agreements, and only to the extent necessary:",
        },
        {
          type: "list",
          items: [
            "Stripe — payment processing",
            "Amazon Web Services — cloud infrastructure (EEA region)",
            "Mailchimp — transactional email delivery",
            "Cloudflare — security and CDN",
            "Google Analytics — anonymised usage analytics (IP anonymisation enabled)",
          ],
        },
      ],
    },
    {
      id: "your-consent",
      label: "Your Consent",
      blocks: [
        {
          type: "p",
          text: "Where we rely on consent as our lawful basis, we obtain clear, specific, and informed consent. You may withdraw consent at any time without penalty. Managing consent preferences is available from Account Settings → Privacy.",
        },
        {
          type: "p",
          text: [
            "For cookie consent, please see our ",
            { text: "Cookies Policy", href: "/legal/cookies" },
            ". For marketing communications, you may unsubscribe at any time via the link in our emails or by updating your notification settings.",
          ],
        },
      ],
    },
    {
      id: "contact-us",
      label: "Contact Us",
      blocks: [
        { type: "p", text: "For all data protection enquiries, subject access requests, or to exercise your rights, please contact our Data Protection Officer:" },
        {
          type: "address",
          title: "Data Protection Officer",
          lines: ["Global Aviation Services Directory Ltd", "Hangar 7, Aviation House, London W2 1RN, United Kingdom"],
          email: "dpo@gasdirectory.aero",
        },
        {
          type: "p",
          text: [
            "You also have the right to lodge a complaint with the UK Information Commissioner’s Office (ICO) at ",
            { text: "ico.org.uk", href: "https://ico.org.uk" },
            " if you believe we have processed your data unlawfully.",
          ],
        },
      ],
    },
  ],
};
