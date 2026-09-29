export const ENQUIRY_STATUSES = ["new", "read", "replied", "closed", "spam"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export interface AdminEnquiry {
  id: string;
  type: "general" | "fleet";
  status: EnquiryStatus;
  provider: { id: string; slug: string; name: string };
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
  trip: {
    tripType: "one-way" | "round-trip" | "multi-leg";
    from: string;
    to: string;
    departAt: string;
    passengers: number;
    aircraft: string;
  } | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const STATUS_OPTIONS = ENQUIRY_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));
