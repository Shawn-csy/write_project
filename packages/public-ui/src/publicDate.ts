/** Public dates use one timezone on the server and in every visitor's browser. */
export const PUBLIC_TIME_ZONE = "Asia/Taipei";

const cardDateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: PUBLIC_TIME_ZONE,
});

const yearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  timeZone: PUBLIC_TIME_ZONE,
});

export function formatPublicCardDate(value?: number | string | null): { label?: string; time?: string } {
  if (value == null || value === "") return {};
  const timestamp = typeof value === "number" ? value : Date.parse(String(value));
  if (!Number.isFinite(timestamp) || timestamp <= 0) return {};
  const date = new Date(timestamp);
  return { label: cardDateFormatter.format(date), time: date.toISOString() };
}

export function formatPublicYear(value: number): string {
  return yearFormatter.format(new Date(value));
}
