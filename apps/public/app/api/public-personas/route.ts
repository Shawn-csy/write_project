import { apiFetch } from "@/lib/api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const data = await apiFetch("/public-personas");
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}
