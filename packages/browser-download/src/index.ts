const INVALID_FILENAME_CHARS = /[^a-z0-9-_]/gi;

export function sanitizeBaseFilename(rawName: unknown, fallback = "file"): string {
  const normalized = String(rawName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(INVALID_FILENAME_CHARS, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

export function buildFilename(baseName: string, extension: string): string {
  const safe = sanitizeBaseFilename(baseName);
  const ext = String(extension || "").replace(/^\.+/, "");
  return ext ? `${safe}.${ext}` : safe;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke in next tick to avoid Safari/Chromium intermittent download drops.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(
  content: string,
  filename: string,
  mimeType = "text/plain;charset=utf-8;"
): void {
  const blob = new Blob([content ?? ""], { type: mimeType });
  downloadBlob(blob, filename);
}
