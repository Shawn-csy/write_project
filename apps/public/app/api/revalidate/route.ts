import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

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

  const revalidated: string[] = [];
  for (const path of paths) {
    if (typeof path === "string" && path.startsWith("/")) {
      revalidatePath(path);
      revalidated.push(path);
    }
  }

  return NextResponse.json({ revalidated, now: Date.now() });
}
