const BACKEND_ORIGIN = (process.env.BACKEND_API_URL || "http://write_project-backend:1091").replace(/\/+$/, "");

function decodeMediaToken(token: string): string {
  const normalized = token.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(token.length / 4) * 4, "=");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function servePublicMediaPath(rawUrl: string): Promise<Response> {
  if (!rawUrl.startsWith("/media/") || rawUrl.includes("..")) {
    return new Response("Invalid media URL", { status: 400 });
  }

  try {
    const target = new URL(rawUrl, `${BACKEND_ORIGIN}/`);
    const upstream = await fetch(target, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return new Response("Media not found", { status: upstream.status || 404 });
    }

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    const contentLength = upstream.headers.get("content-length");
    const inferredType = /\.webp(?:$|\?)/i.test(target.pathname)
      ? "image/webp"
      : /\.jpe?g(?:$|\?)/i.test(target.pathname)
        ? "image/jpeg"
        : /\.png(?:$|\?)/i.test(target.pathname)
          ? "image/png"
          : contentType;
    if (inferredType) headers.set("content-type", inferredType);
    if (contentLength) headers.set("content-length", contentLength);
    headers.set("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return new Response("Media unavailable", { status: 502 });
  }
}

function isDisallowedRemoteHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host === "0.0.0.0" || host === "169.254.169.254") return true;

  const octets = host.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = octets;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

async function serveRemoteImage(rawUrl: string): Promise<Response> {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return new Response("Invalid media URL", { status: 400 });
  }
  if (!(target.protocol === "http:" || target.protocol === "https:") || target.username || target.password || isDisallowedRemoteHost(target.hostname)) {
    return new Response("Invalid media URL", { status: 400 });
  }

  try {
    const upstream = await fetch(target, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return new Response("Media not found", { status: upstream.status || 404 });
    }
    const contentType = upstream.headers.get("content-type") || "";
    if (contentType && !contentType.toLowerCase().startsWith("image/")) {
      return new Response("Media is not an image", { status: 415 });
    }
    const headers = new Headers();
    if (contentType) headers.set("content-type", contentType);
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);
    headers.set("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return new Response("Media unavailable", { status: 502 });
  }
}

export async function servePublicMedia(token: string): Promise<Response> {
  let rawUrl = "";
  try {
    rawUrl = decodeMediaToken(token);
  } catch {
    return new Response("Invalid media token", { status: 400 });
  }
  return servePublicMediaPath(rawUrl);
}

export async function serveExternalPublicMedia(id: string): Promise<Response> {
  try {
    const response = await fetch(`${BACKEND_ORIGIN}/api/public-bundle`, { cache: "no-store" });
    if (!response.ok) return new Response("Media source unavailable", { status: 502 });
    const bundle = await response.json() as { externalPublicScripts?: Array<{ id?: string; coverUrl?: string }> };
    const item = (bundle.externalPublicScripts || []).find((candidate) => candidate.id === id);
    if (!item?.coverUrl) return new Response("Media not found", { status: 404 });
    return item.coverUrl.startsWith("/media/")
      ? servePublicMediaPath(item.coverUrl)
      : serveRemoteImage(item.coverUrl);
  } catch {
    return new Response("Media source unavailable", { status: 502 });
  }
}
