import type { LegalDoc } from "../types";

export const REFUND_POLICY: LegalDoc = {
  crumb: "Refund Policy",
  title: "Refund Policy",
  summary: "Our fair and transparent refund policy applies to all subscription plans and services.",
  updated: "Last updated: 1 September 2026",
  tocTitle: "Contents",
  numberedHeadings: true,
  lead: [
    {
      type: "highlights",
      items: [
        { emoji: "🕐", title: "14-Day Guarantee", text: "14-day full refund from the date of subscription for new subscribers." },
        { emoji: "⚡", title: "Fast Processing", text: "Refunds will be issued within 5-10 business days to your original payment method." },
        { emoji: "💬", title: "No Questions Asked", text: "Eligible refund requests within the guarantee period." },
      ],
    },
  ],
  sections: [
    {
      id: "introduction",
      label: "Introduction",
      blocks: [
        {
          type: "p",
          text: [
            "This Refund Policy applies to all subscription packages bought from Book My FBO. This is a part of our ",
            { text: "Terms of Service", href: "/legal/terms" },
            ". The policy does not affect your statutory consumer rights.",
          ],
        },
      ],
    },
    {
      id: "eligibility",
      label: "Eligibility",
      blocks: [
        { type: "p", text: "A full refund will be issued if you satisfy all of the following criteria:" },
        {
          type: "list",
          items: [
            "You are a new subscriber buying the Pro or Ultra Pro service for the first time",
            "You make the refund claim within 14 days from the date of your first payment",
            "You have never claimed a refund before based on this policy",
            "Your account has not been suspended or canceled due to any violation of our Terms of Service",
          ],
        },
        {
          type: "p",
          text: "Refunds for renewals made monthly or annually are possible only if they are made within 48 hours of making the payment and have not been utilized yet.",
        },
      ],
    },
    {
      id: "refund-conditions",
      label: "Refund Conditions",
      heading: "Subscription Refund Conditions",
      blocks: [
        {
          type: "table",
          head: ["Scenario", "Refund Eligible", "Amount"],
          rows: [
            ["New subscription, within 14 days", "Yes", "100% refund"],
            ["New subscription, after 14 days", "No", "No refund"],
            ["Annual renewal, within 48 hours", "Yes", "Pro-rata refund"],
            ["Monthly renewal, within 48 hours", "Yes", "Full month refund"],
            ["Downgrade mid-cycle", "Yes", "Pro-rata credit"],
            ["Provider listing fees", "No", "Non-refundable"],
            ["Data licence fees", "No", "Non-refundable"],
          ],
        },
      ],
    },
    {
      id: "refund-process",
      label: "Refund Process",
      blocks: [
        {
          type: "p",
          text: [
            "To apply for a refund, contact our billing department at ",
            { text: "info@bookmyfbo.com", href: "mailto:info@bookmyfbo.com" },
            " using your registered email with your account and specify the invoice number and reason for your refund request. Once your request is evaluated by our team, we will send you an email confirmation.",
          ],
        },
      ],
    },
    {
      id: "processing-timeline",
      label: "Processing Time Frame",
      blocks: [
        {
          type: "p",
          text: "If your refund request is granted, the refund will be sent to the original payment method used during purchase and will take up to 5-10 business days. The subscription plan will be downgraded to Free.",
        },
        {
          type: "p",
          text: "Processing times depend on the bank. Refunds for credit/debit cards usually show up on your statement within 3-5 business days after processing, but bank transfers take more time depending on your bank.",
        },
      ],
    },
    {
      id: "non-refundable",
      label: "Non-Refundable Cases",
      blocks: [
        { type: "p", text: "The following is not eligible for a refund:" },
        {
          type: "list",
          items: [
            "Fee for provider listing (Basic, Pro, Ultra Pro listings) after publication",
            "Data license fee and API access charges",
            "Custom advertisement bookings (after campaign launch)",
            "Subscriptions acquired via third-party resellers: contact the reseller",
            "Account suspended/terminated due to Terms of Service violation",
          ],
        },
        {
          type: "banner",
          title: "Questions about a refund?",
          text: "Our billing team typically responds within 24 hours on business days.",
          cta: { label: "Contact Billing Support", href: "/contact" },
        },
      ],
    },
  ],
};
