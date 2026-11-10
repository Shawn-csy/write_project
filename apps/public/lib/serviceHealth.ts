import { NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://write_project-backend:1091";
const READINESS_TIMEOUT_MS = 3000;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type BackendHealth = {
  status?: string;
  publicApiCapabilities?: string[];
};

const REQUIRED_PUBLIC_API_CAPABILITIES = [
  "public-bundle-sections",
  "external-cover-lookup",
  "public-activity-status",
  "audio-works",
] as const;

export function livenessResponse(): NextResponse {
  return NextResponse.json(
    { status: "ok", service: "public" },
    { headers: NO_STORE_HEADERS },
  );
}

export async function readinessResponse(): Promise<NextResponse> {
  const backendUrl = (process.env.BACKEND_API_URL ?? DEFAULT_BACKEND_URL).replace(/\/+$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), READINESS_TIMEOUT_MS);

  try {
    const response = await fetch(`${backendUrl}/api/health/ready`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const health = response.ok
      ? await response.json().catch(() => null) as BackendHealth | null
      : null;

    if (!response.ok || health?.status !== "ready") {
      throw new Error("backend unavailable");
    }

    const capabilities = Array.isArray(health.publicApiCapabilities) ? health.publicApiCapabilities : [];
    if (!REQUIRED_PUBLIC_API_CAPABILITIES.every((capability) => capabilities.includes(capability))) {
      return NextResponse.json(
        {
          status: "unavailable",
          service: "public",
          checks: { backend: "incompatible" },
        },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        status: "ready",
        service: "public",
        checks: { backend: "ok" },
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        service: "public",
        checks: { backend: "failed" },
      },
      {
        status: 503,
        headers: NO_STORE_HEADERS,
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}
