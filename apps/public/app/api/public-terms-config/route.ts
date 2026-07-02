import { apiFetch } from "@/lib/api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const TERMS_CONFIG_TTL = 3600;

export async function GET(): Promise<NextResponse> {
  try {
    const data = await apiFetch("/public-terms-config");
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, max-age=${TERMS_CONFIG_TTL}, stale-while-revalidate=86400`,
      },
    });
  } catch {
    // Backend unavailable — ConsentGate fails open (does not block reader)
    return NextResponse.json(null, { status: 502 });
  }
}
