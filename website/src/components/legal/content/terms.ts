import type { LegalDoc } from "../types";

export const TERMS_OF_SERVICE: LegalDoc = {
  crumb: "Terms of Service",
  title: "Terms of Service",
  summary: "Please read these terms carefully before using the Book My FBO platform.",
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
          text: "The present Terms of Service regulate the use of and access to the Book My FBO websites, applications, APIs and other services provided by Book My FBO.",
        },
        {
          type: "p",
          text: [
            "By accessing or using the Platform, you are agreeing to be bound by these Terms and our ",
            { text: "Privacy Policy", href: "/legal/privacy" },
            ". In case you are using the Platform on behalf of a legal entity, you state that you have the necessary authority to bind such entity to these Terms. You should not use the Platform if you do not agree to these Terms.",
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
          text: "To register on the Platform, you must be at least 18 years old. You promise to provide correct, timely, and complete information during the registration process.",
        },
        {
          type: "p",
          text: "Your account is personal and can be used by only one person unless you have the team or enterprise plans, which allow you to use several seats. You shall ensure the confidentiality of your credentials and are fully responsible for any action performed under your account.",
        },
      ],
    },
    {
      id: "directory-usage",
      label: "Directory Use",
      blocks: [
        {
          type: "p",
          text: "The directory, as well as all the information contained therein, is provided to you for your internal commercial and operational purposes only. You may not harvest, download, resell, or redistribute the directory information unless under a separate data license agreement.",
        },
        {
          type: "p",
          text: "Directory listings are provided for informational purposes only. Although we make efforts to verify the providers as well as update our information, we cannot guarantee completeness, accuracy, and up-to-date status of any listing, so you need to check the information yourself with the respective provider.",
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
          text: "Providers who advertise their services via our platform are fully responsible for the completeness, accuracy, validity, and pricing of their listings and services provided. Any agreement for services is entered into directly between you and such provider; we are not a party to it.",
        },
        {
          type: "p",
          text: "We reserve the right to remove or modify listings which are inaccurate, misleading, infringing on third-party rights, or not passing our verification process.",
        },
      ],
    },
    {
      id: "membership-terms",
      label: "Membership Terms",
      heading: "Terms of Membership and Subscription",
      blocks: [
        {
          type: "p",
          text: "The subscriptions are prepaid on a monthly or annual basis and are automatically renewed at the end of each subscription period unless terminated from the Account settings before renewal. The prices are indicated excluding taxes.",
        },
        {
          type: "p",
          text: [
            "Annual plans will be paid once for 12 months. The termination of the subscription will end the next renewal of the plan, but access will be available up to the end of the paid period. Any refund will be processed based on our ",
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
          text: "All intellectual property including texts, graphics, logos, data compilations, software and the look and feel of the Platform, is either owned or licensed by Book My FBO Ltd and is protected by the laws of copyright, databases and trademarks.",
        },
        {
          type: "p",
          text: "Any reproduction, distribution, modification and creation of derivative works based on any part of the Platform are prohibited unless we give you written permission to do so according to these Terms or a different licensing agreement.",
        },
      ],
    },
    {
      id: "prohibited-usage",
      label: "Unauthorized Usage",
      blocks: [
        { type: "p", text: "You must not use the Platform to:" },
        {
          type: "list",
          items: [
            "Break any applicable laws or regulations",
            "Send any unsolicited or unauthorized advertising or promotional material",
            "Attempt to obtain unauthorized access to any portion of the Platform, any account or systems connected to the Platform",
            "Interfere with or impair the functioning of the Platform",
            "Upload any malware, viruses, or other malicious code",
            "Disguise your identity as someone else or an entity",
            "Collect user information without permission",
            "Override security restrictions",
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
          text: "Except where expressly provided otherwise in these Terms, Book My FBO Ltd will not be responsible for any indirect, incidental, special, or consequential damages or loss of profits, revenues, data, or goodwill arising out of or in connection with your use of the Platform.",
        },
        {
          type: "p",
          text: "Our aggregate liability to you for any claims made under or in relation to these Terms is limited to the fees paid by you to us in the 12 months prior to the event giving rise to the claim. Our liability will not be limited where we are precluded from doing so by law.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Aviation Safety Disclaimer",
          text: "Information provided on the Platform, including weather, NOTAMs, runway diagrams and airport data, is for planning and reference purposes only and must not be used as a primary source for flight operations or navigation. Always consult official, current aeronautical publications and your authorised briefing sources.",
        },
      ],
    },
    {
      id: "termination",
      label: "Termination",
      blocks: [
        {
          type: "p",
          text: "Either party may terminate your account at any time. You can terminate your account from Account Settings, and we may suspend or terminate access immediately for material breach of these Terms or when necessary under law.",
        },
        {
          type: "p",
          text: "Upon termination, your right to access the Platform terminates immediately. Terms that inherently must survive termination (such as intellectual property, limitation of liability, and governing law) will survive termination.",
        },
      ],
    },
    {
      id: "contact",
      label: "Contact",
      blocks: [
        {
          type: "p",
          text: ["Any questions concerning these Terms can be addressed to ", { text: "info@bookmyfbo.com", href: "mailto:info@bookmyfbo.com" }, "."],
        },
        { type: "cta", label: "Contact Team", href: "/contact" },
      ],
    },
  ],
};
