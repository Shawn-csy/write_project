/** Address of the writing studio for the current deployment environment. */
const STUDIO_ORIGIN = (process.env.NEXT_PUBLIC_STUDIO_ORIGIN ?? "").replace(/\/+$/, "");

export function studioUrl(path = "/dashboard"): string {
  return `${STUDIO_ORIGIN}${path}`;
}
