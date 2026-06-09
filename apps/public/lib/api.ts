/**
 * Server-side API client for fetching from the backend.
 * Only used in Server Components / Route Handlers.
 */

const API_BASE = process.env.BACKEND_API_URL ?? "http://write_project-backend:1091";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}/api${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
