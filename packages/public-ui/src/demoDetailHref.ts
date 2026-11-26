export function demoDetailHref(key: string): string {
  const separator = key.indexOf(":");
  if (separator < 0) return "/demos";
  const kind = key.slice(0, separator);
  const id = key.slice(separator + 1);
  if (!id || (kind !== "internal" && kind !== "external" && kind !== "submitted")) return "/demos";
  return `/demos/${kind}/${encodeURIComponent(id)}`;
}
