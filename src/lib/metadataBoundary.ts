/**
 * Reserved customMetadata keys that were once written by the save flow but are
 * now superseded by structured API fields.  These keys must NOT be written by
 * any new code path.  They are kept here solely so legacy-read adapters can
 * recognize and drain them during hydration.
 *
 * See docs/refactor/metadata-boundary.md for the full boundary RFC.
 */
export const RESERVED_CUSTOM_KEYS = new Set([
  "author",
  "authors",
  "authordisplaymode",
  "licensecommercial",
  "licensederivative",
  "licensenotify",
  "licensespecialterms",
  "licensetags",
  "series",
  "seriesorder",
  "marker_legend",
  "show_legend",
  "synopsis",
  "outline",
  "activityname",
  "activitybanner",
  "activitycontent",
  "activityworkurl",
  "activitydemolinks",
  "activitydemourl",
  "eventname",
  "eventbanner",
  "eventcontent",
  "eventworklink",
  "eventdemolinks",
  "eventdemolink",
]);

/** Normalize a customMetadata key for comparison against RESERVED_CUSTOM_KEYS. */
export function normalizeMetaKey(key: unknown): string {
  return String(key ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/** Returns true if the key is reserved (i.e. owned by a structured API field). */
export function isReservedCustomKey(key: unknown): boolean {
  return RESERVED_CUSTOM_KEYS.has(normalizeMetaKey(key));
}
