import type { Response } from "express";

const UTF8_BOM = String.fromCharCode(0xfeff);

/** Characters that make spreadsheet apps treat a cell as a formula (CSV/formula injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * RFC 4180 cell encoding that is also safe to open in Excel/Sheets:
 * formula-like values are prefixed with `'` and anything with a quote,
 * comma or line break is quoted with inner quotes doubled.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(values: readonly unknown[]): string {
  return `${values.map(csvCell).join(",")}\r\n`;
}

/** Sets download headers. A UTF-8 BOM makes Excel pick the right encoding for names with accents. */
export function startCsvDownload(res: Response, filename: string, header: readonly string[]): void {
  res.status(200);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`);
  res.setHeader("Cache-Control", "no-store");
  res.write(`${UTF8_BOM}${csvRow(header)}`);
}

/** Writes a row, waiting for the socket to drain so large exports don't buffer in memory. */
export async function writeCsvRow(res: Response, values: readonly unknown[]): Promise<void> {
  if (!res.write(csvRow(values))) await new Promise<void>((resolve) => res.once("drain", resolve));
}
