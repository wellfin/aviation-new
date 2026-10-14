/** The two charter directories behind the header's "Charter" tab. They share one search and results design. */
export const CHARTER_KINDS = {
  operator: { category: "charter-operator", basePath: "/charter-operators", one: "operator", many: "operators", title: "Charter Operators" },
  broker: { category: "charter-broker", basePath: "/charter-brokers", one: "broker", many: "brokers", title: "Charter Brokers" },
} as const;

export type CharterKind = keyof typeof CHARTER_KINDS;
