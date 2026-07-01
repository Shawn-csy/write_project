import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

const MAX_PATHS = 50;
const MAX_PATH_LENGTH = 300;

// Allowed path patterns for public pages only.
const ALLOWED_PATH_RE =
  /^(\/|\/read\/[^/?#]+|\/author\/[^/?#]+|\/org\/[^/?#]+|\/series\/[^/?#]+|\/tag\/[^/?#]+|\/sitemap\.xml)$/;

function isAllowedPath(path: string): boolean {
  if (typeof path !== "string") return false;
  if (path.length > MAX_PATH_LENGTH) return false;
  // Reject double-slash, backslash, query strings, fragments, control chars.
  if (/[\\?#\x00-\x1f]/.test(path)) return false;
  if (path.includes("//")) return false;
  return ALLOWED_PATH_RE.test(path);
}

/**
 * POST /api/revalidate
 *
 * Called by the backend after a script/persona/org is updated.
 * Clears ISR cache for the specified path so the next request re-renders fresh HTML.
 *
 * Body: { secret: string, paths: string[] }
 * Example: { secret: "...", paths: ["/read/abc123"] }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Revalidation not configured" }, { status: 500 });
  }

  let body: { secret?: string; paths?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.secret !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const paths = Array.isArray(body.paths) ? body.paths : [];
  if (paths.length === 0) {
    return NextResponse.json({ error: "No paths provided" }, { status: 400 });
  }
  if (paths.length > MAX_PATHS) {
    return NextResponse.json({ error: `Too many paths (max ${MAX_PATHS})` }, { status: 400 });
  }

  const rejected: string[] = [];
  for (const path of paths) {
    if (!isAllowedPath(path)) {
      rejected.push(typeof path === "string" ? path : String(path));
    }
  }

  if (rejected.length > 0) {
    return NextResponse.json({ error: "Invalid paths", rejected }, { status: 400 });
  }

  const revalidated: string[] = [];
  for (const path of paths) {
    revalidatePath(path);
    revalidated.push(path);
  }

  return NextResponse.json({ revalidated, now: Date.now() });
}
