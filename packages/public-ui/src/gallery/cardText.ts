/**
 * Shared text helpers for gallery card display fields.
 * Pure functions — no React, no i18n.
 */

export const CARD_SUMMARY_MAX_CHARS = 72;

/** Normalize short summary text — collapses all whitespace to single spaces. */
export function normalizeCardText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Normalize outline text — trims leading/trailing whitespace and collapses
 * runs of 3+ blank lines to 2, but preserves paragraph breaks (single blank
 * lines) so `whitespace-pre-wrap` renders structure correctly.
 */
export function normalizeOutlineText(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncateCardText(value: string, maxChars = CARD_SUMMARY_MAX_CHARS): string {
  const normalized = normalizeCardText(value);
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars).trimEnd()}...`;
}
