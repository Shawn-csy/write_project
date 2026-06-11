import { apiFetch } from "@/lib/api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const data = await apiFetch("/public-terms-config");
    return NextResponse.json(data);
  } catch {
    // Backend unavailable — ConsentGate fails open (does not block reader)
    return NextResponse.json(null, { status: 502 });
  }
}
