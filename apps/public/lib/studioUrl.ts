/**
 * Address of the writing studio.
 *
 * The studio is not part of the static public site: it runs on the local
 * server and is reached through the tunnel, so it is gone whenever that server
 * is offline. A normal deployment serves both from one origin and leaves
 * NEXT_PUBLIC_STUDIO_ORIGIN empty, which keeps these links relative.
 */
const STUDIO_ORIGIN = (process.env.NEXT_PUBLIC_STUDIO_ORIGIN ?? "").replace(/\/+$/, "");

export function studioUrl(path = "/dashboard"): string {
  return `${STUDIO_ORIGIN}${path}`;
}
