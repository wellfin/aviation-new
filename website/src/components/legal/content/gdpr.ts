import type { LegalDoc } from "../types";

export const GDPR_COMPLIANCE: LegalDoc = {
  crumb: "GDPR",
  title: "GDPR Compliance",
  summary: "Book My FBO is committed to protecting your personal data and complying fully with the General Data Protection Regulation (GDPR).",
  updated: "Last updated: 1 September 2026",
  badge: "GDPR Compliant",
  tocTitle: "Contents",
  numberedHeadings: false,
  sections: [
    {
      id: "overview",
      label: "Introduction",
      blocks: [
        {
          type: "p",
          text: "The General Data Protection Regulation (GDPR) is a regulation of EU law about data protection and privacy for all individuals in the European Union and the European Economic Area. The regulation also deals with the transfer of personal data outside the EU and EEA jurisdictions.",
        },
        {
          type: "p",
          text: "Book My FBO serves as both a Data Controller (regarding user account and registration data) and a Data Processor (regarding business customer data for providers' listings). This document describes your rights and our responsibilities concerning GDPR.",
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
            { title: "Right to Object", text: "You have the right to object to the processing of your data for marketing or profiling purposes." },
            {
              title: "Right to Withdraw Consent",
              text: "Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.",
            },
          ],
        },
        {
          type: "p",
          text: [
            "To exercise any of these rights, please submit a Subject Access Request (SAR) via your account settings or email us at ",
            { text: "info@bookmyfbo.com", href: "mailto:info@bookmyfbo.com" },
            ".",
          ],
        },
      ],
    },
    {
      id: "data-we-collect",
      label: "The Data We Collect",
      blocks: [
        { type: "p", text: "Only the data that is required to deliver our services will be collected. The data categories are as follows:" },
        {
          type: "list",
          items: [
            "Identification data (name, username)",
            "Contact information (email address, phone number)",
            "Account data (password hash, preferences, subscription level)",
            "Use data (pages accessed, features utilized, session duration)",
            "Technical data (IP address, browser type, device identifiers)",
            "Transaction data (Stripe handles transaction data and does not store any credit card information)",
            "Communications data (support ticket and enquiry forms)",
          ],
        },
      ],
    },
    {
      id: "data-processing",
      label: "Processing Your Personal Data",
      blocks: [
        { type: "p", text: "Your personal data is processed on the following legal grounds according to Article 6 GDPR:" },
        {
          type: "cards",
          columns: 2,
          items: [
            { title: "Contract performance", text: "Providing subscription services, managing accounts" },
            { title: "Legitimate interests", text: "Preventing fraud, improving our services and security" },
            { title: "Legal obligation", text: "Taxation, accounting, anti-money laundering compliance" },
            { title: "Consent", text: "Marketing communication, non-essential cookies, data sharing with partners" },
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
          text: "We keep your personal data only for as long as it is necessary for its original purpose, or as dictated by law. Example retention periods: active user data, while the account exists + 3 years; payment information: 7 years (mandatory); support correspondence: 2 years; anonymized data analysis: indefinite period.",
        },
      ],
    },
    {
      id: "data-sharing",
      label: "Data Sharing",
      blocks: [
        {
          type: "p",
          text: "We do not sell your personal data. We disclose your personal data to only trustworthy service providers who enter into data processing agreements with us, and to the extent it is necessary for our operations:",
        },
        {
          type: "list",
          items: [
            "Stripe – payment processing",
            "Amazon Web Services – cloud hosting (in EEA region)",
            "Mailchimp – transactional email delivery",
            "Cloudflare – security and CDN services",
            "Google Analytics – anonymized usage analytics (IP anonymization enabled)",
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
          text: "If our lawful basis for processing your personal information is consent, then we will seek and obtain your consent, which is clear, specific, and informed. You can revoke your consent at any time without any consequences.",
        },
        {
          type: "p",
          text: [
            "Regarding cookie consent, please refer to our ",
            { text: "Cookies Policy", href: "/legal/cookies" },
            ". Unsubscribing from marketing communications is easy at any time by clicking the link contained in our emails or by adjusting your notification preferences.",
          ],
        },
      ],
    },
    {
      id: "contact-us",
      label: "Contact Us",
      blocks: [
        {
          type: "p",
          text: [
            "For any queries regarding data protection or subject access requests, please contact ",
            { text: "info@bookmyfbo.com", href: "mailto:info@bookmyfbo.com" },
            ".",
          ],
        },
      ],
    },
  ],
};
