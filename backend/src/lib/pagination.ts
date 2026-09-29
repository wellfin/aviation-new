import { z } from "zod";

export const MAX_PAGE_SIZE = 100;

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
});

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginated<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function skipFor(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/** Escapes user input for safe use inside a RegExp (prevents ReDoS / regex injection). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive "contains" matcher for a free-text search term, length-capped. */
export function containsRegex(term: string): RegExp {
  return new RegExp(escapeRegex(term.trim().slice(0, 100)), "i");
}
