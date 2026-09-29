import type { LegalDoc } from "../types";

export const TERMS_OF_SERVICE: LegalDoc = {
  crumb: "Terms of Service",
  title: "Terms of Service",
  summary: "Please read these terms carefully before using the Global Aviation Services Directory platform.",
  updated: "Last updated: 1 September 2026 · Effective: 1 September 2026",
  tocTitle: "Table of Contents",
  numberedHeadings: true,
  sections: [
    {
      id: "introduction",
      label: "Introduction",
      blocks: [
        {
          type: "p",
          text: 'These Terms of Service ("Terms") govern your access to and use of the Global Aviation Services Directory website, applications, APIs and related services (together, the "Platform"), operated by Global Aviation Services Directory Ltd ("we", "our", "us"), a company registered in England and Wales.',
        },
        {
          type: "p",
          text: [
            "By accessing or using the Platform, you agree to be bound by these Terms and our ",
            { text: "Privacy Policy", href: "/legal/privacy" },
            ". If you are using the Platform on behalf of an organisation, you confirm that you are authorised to accept these Terms on its behalf. If you do not agree, you must not use the Platform.",
          ],
        },
      ],
    },
    {
      id: "account-usage",
      label: "Account Usage",
      blocks: [
        {
          type: "p",
          text: "You must be at least 18 years of age to create an account. You agree to provide accurate, current and complete information during registration and to keep it up to date.",
        },
        {
          type: "p",
          text: "Each account is for a single individual user unless you hold a team or enterprise plan that expressly permits multiple seats. You are responsible for keeping your credentials confidential and for all activity that occurs under your account. Notify us immediately of any unauthorised use.",
        },
        {
          type: "p",
          text: "We reserve the right to suspend or terminate accounts that provide false information, share credentials, or otherwise breach these Terms.",
        },
      ],
    },
    {
      id: "directory-usage",
      label: "Directory Usage",
      blocks: [
        {
          type: "p",
          text: "The directory and all data within it is provided for your own internal business and operational use. You may not scrape, bulk-download, resell or redistribute directory data except under a separate data licence agreement.",
        },
        {
          type: "p",
          text: "Directory listings are provided for informational purposes only. While we verify providers and refresh data regularly, we do not guarantee that any listing is complete, accurate or current, and you should confirm details directly with the provider before relying on them.",
        },
      ],
    },
    {
      id: "service-providers",
      label: "Service Providers",
      heading: "Service Provider Information",
      blocks: [
        {
          type: "p",
          text: "Service providers who list on the platform are solely responsible for the accuracy of their listing, their pricing, and the services they deliver. Any contract for services is made directly between you and the provider; we are not a party to it and do not act as an agent for either side.",
        },
        {
          type: "p",
          text: "We reserve the right to remove or edit listings that are inaccurate, misleading, infringe third-party rights, or fail our verification standards.",
        },
      ],
    },
    {
      id: "membership-terms",
      label: "Membership Terms",
      heading: "Membership & Subscription Terms",
      blocks: [
        {
          type: "p",
          text: "Subscriptions are billed in advance on a monthly or annual basis and renew automatically at the end of each billing period unless cancelled from Account Settings before the renewal date. Prices are shown exclusive of applicable taxes.",
        },
        {
          type: "p",
          text: [
            "Annual plans are paid upfront for 12 months. Cancellation stops the next renewal; access continues until the end of the paid period. Refunds are handled under our ",
            { text: "Refund Policy", href: "/legal/refund" },
            ".",
          ],
        },
      ],
    },
    {
      id: "intellectual-property",
      label: "Intellectual Property",
      blocks: [
        {
          type: "p",
          text: "All content on the Platform — including text, graphics, logos, data compilations, software and the look and feel of the site — is owned by or licensed to Global Aviation Services Directory Ltd and is protected by copyright, database rights and trademark law.",
        },
        {
          type: "p",
          text: "You may not reproduce, distribute, modify, or create derivative works from any part of the Platform without our prior written consent, except as permitted by these Terms or a separate licence agreement.",
        },
      ],
    },
    {
      id: "prohibited-usage",
      label: "Prohibited Usage",
      blocks: [
        { type: "p", text: "You may not use the Platform to:" },
        {
          type: "list",
          items: [
            "Violate any applicable law or regulation",
            "Transmit any unsolicited or unauthorised advertising or promotional material",
            "Attempt to gain unauthorised access to any part of the Platform, other accounts, or connected systems",
            "Interfere with or disrupt the integrity or performance of the Platform",
            "Upload malware, viruses, or any destructive code",
            "Impersonate any person or organisation",
            "Collect user data without consent",
            "Circumvent any access control measures",
          ],
        },
      ],
    },
    {
      id: "liability",
      label: "Liability",
      blocks: [
        {
          type: "p",
          text: "To the maximum extent permitted by law, Global Aviation Services Directory Ltd shall not be liable for any indirect, incidental, special or consequential loss, or for loss of profits, revenue, data or goodwill, arising out of or in connection with your use of the Platform.",
        },
        {
          type: "p",
          text: "Our total liability to you for any claims arising under or in connection with these Terms is limited to the fees you paid to us in the 12 months preceding the event giving rise to the claim. Nothing in these Terms limits liability that cannot be limited by law.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Aviation Safety Disclaimer",
          text: "Information provided on the Platform — including weather, NOTAMs, runway diagrams and airport data — is for planning and reference purposes only and must not be used as a primary source for flight operations or navigation. Always consult official, current aeronautical publications and your authorised briefing sources.",
        },
      ],
    },
    {
      id: "termination",
      label: "Termination",
      blocks: [
        {
          type: "p",
          text: "Either party may terminate your account at any time. You can close your account from Account Settings; we may suspend or terminate access immediately if you materially breach these Terms or where required by law.",
        },
        {
          type: "p",
          text: "Upon termination, your right to access the Platform ceases immediately. Provisions that by their nature should survive termination — including intellectual property, liability limitations and governing law — will continue to apply.",
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
            "For any questions regarding these Terms, please contact our legal team at ",
            { text: "legal@gasdirectory.aero", href: "mailto:legal@gasdirectory.aero" },
            ". These Terms are governed by the laws of England and Wales.",
          ],
        },
        { type: "cta", label: "Contact Team", href: "/contact" },
      ],
    },
  ],
};
