import type { LegalDoc } from "../types";

export const REFUND_POLICY: LegalDoc = {
  crumb: "Refund Policy",
  title: "Refund Policy",
  summary: "Our fair and transparent refund policy for all subscription plans and services.",
  updated: "Last updated: 1 September 2026",
  tocTitle: "Contents",
  numberedHeadings: true,
  lead: [
    {
      type: "highlights",
      items: [
        { emoji: "🕐", title: "14-Day Guarantee", text: "Full refund within 14 days of subscription for new subscribers." },
        { emoji: "⚡", title: "Fast Processing", text: "Refunds processed within 5–10 business days to original payment method." },
        { emoji: "💬", title: "No Questions Asked", text: "For eligible refund requests within the guarantee period." },
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
            "This Refund Policy applies to all subscription plans purchased directly from Global Aviation Services Directory Ltd through gasdirectory.aero. It forms part of our ",
            { text: "Terms of Service", href: "/legal/terms" },
            ". Your statutory consumer rights are not affected.",
          ],
        },
      ],
    },
    {
      id: "eligibility",
      label: "Eligibility",
      blocks: [
        { type: "p", text: "You are eligible for a full refund if you meet all of the following conditions:" },
        {
          type: "list",
          items: [
            "You are a new subscriber purchasing Pro or Ultra Pro for the first time",
            "The refund request is made within 14 calendar days of the initial payment",
            "You have not previously received a refund under this policy",
            "Your account has not been suspended or terminated for a breach of our Terms of Service",
          ],
        },
        {
          type: "p",
          text: "Renewal charges (monthly or annual) are eligible for a refund only if requested within 48 hours of the renewal payment and the paid features have not been used since renewal.",
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
            "To request a refund, please contact our billing team at ",
            { text: "billing@gasdirectory.aero", href: "mailto:billing@gasdirectory.aero" },
            " from the email address registered to your account, including your invoice number and the reason for your request.",
          ],
        },
        {
          type: "p",
          text: "Alternatively, eligible refund requests can be submitted from Account Settings → Billing → Request Refund. You will receive an email confirmation once your request has been reviewed.",
        },
      ],
    },
    {
      id: "processing-timeline",
      label: "Processing Timeline",
      blocks: [
        {
          type: "p",
          text: "Once your refund request is approved, the refund will be issued to your original payment method within 5–10 business days. Your subscription is downgraded to the Free plan at the same time.",
        },
        {
          type: "p",
          text: "Bank processing times may vary. Credit and debit card refunds typically appear on your statement within 3–5 business days of being issued; bank transfers may take longer depending on your bank.",
        },
      ],
    },
    {
      id: "non-refundable",
      label: "Non-Refundable Cases",
      blocks: [
        { type: "p", text: "The following are not eligible for a refund:" },
        {
          type: "list",
          items: [
            "Provider listing fees (Basic, Pro, Ultra Pro listings) once the listing has been published",
            "Data licence fees and API access charges",
            "Custom advertisement bookings (once campaign is live)",
            "Subscriptions purchased through third-party resellers — contact the reseller directly",
            "Accounts suspended or terminated for breach of Terms of Service",
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
