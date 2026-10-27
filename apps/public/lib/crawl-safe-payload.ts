const ESCAPE = "\uE000";

function encodeCrawlSafeString(value: string): string {
  return value
    .replaceAll(ESCAPE, `${ESCAPE}0`)
    .replace(/(^|\n)([ \t]*)\//g, `$1$2${ESCAPE}1`);
}

function decodeCrawlSafeString(value: string): string {
  return value
    .replaceAll(`${ESCAPE}1`, "/")
    .replaceAll(`${ESCAPE}0`, ESCAPE);
}

function mapPayloadStrings<T>(value: T, transform: (text: string) => string): T {
  if (typeof value === "string") return transform(value) as T;
  if (Array.isArray(value)) {
    return value.map((item) => mapPayloadStrings(item, transform)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, mapPayloadStrings(item, transform)]),
    ) as T;
  }
  return value;
}

/**
 * Prevent script lines such as `/p2` from looking like crawlable relative URLs
 * in the React Server Component payload. The reader restores the original
 * strings before rendering, so the published text stays unchanged.
 */
export function encodeCrawlSafePayload<T>(value: T): T {
  return mapPayloadStrings(value, encodeCrawlSafeString);
}

export function decodeCrawlSafePayload<T>(value: T): T {
  return mapPayloadStrings(value, decodeCrawlSafeString);
}
