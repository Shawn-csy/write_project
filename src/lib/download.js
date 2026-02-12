const INVALID_FILENAME_CHARS = /[^a-z0-9-_]/gi;

export const sanitizeBaseFilename = (rawName, fallback = "file") => {
  const normalized = String(rawName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(INVALID_FILENAME_CHARS, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
};

export const buildFilename = (baseName, extension) => {
  const safeBaseName = sanitizeBaseFilename(baseName);
  const safeExtension = String(extension || "").replace(/^\.+/, "");
  return safeExtension ? `${safeBaseName}.${safeExtension}` : safeBaseName;
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadText = (content, filename, mimeType = "text/plain;charset=utf-8;") => {
  const blob = new Blob([content ?? ""], { type: mimeType });
  downloadBlob(blob, filename);
};
