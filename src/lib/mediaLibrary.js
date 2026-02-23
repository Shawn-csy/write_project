const MEDIA_LIBRARY_KEY = "media_library_items_v1";
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25MB
export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);
export const MEDIA_FILE_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/gif";
const MB = 1024 * 1024;

export const IMAGE_UPLOAD_RULES = {
  cover: {
    minWidth: 640,
    minHeight: 360,
    maxWidth: 4096,
    maxHeight: 4096,
    maxBytes: 8 * MB,
    recommended: "1200 x 630",
  },
  avatar: {
    minWidth: 256,
    minHeight: 256,
    maxWidth: 2048,
    maxHeight: 2048,
    maxBytes: 3 * MB,
    recommended: "512 x 512",
  },
  banner: {
    minWidth: 960,
    minHeight: 320,
    maxWidth: 4096,
    maxHeight: 2048,
    maxBytes: 6 * MB,
    recommended: "1500 x 500",
  },
  logo: {
    minWidth: 256,
    minHeight: 256,
    maxWidth: 2048,
    maxHeight: 2048,
    maxBytes: 3 * MB,
    recommended: "512 x 512",
  },
};

function safeParse(jsonText, fallback) {
  try {
    const parsed = JSON.parse(jsonText);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function nowTs() {
  return Date.now();
}

export function isSupportedMediaFile(file) {
  if (!file) return false;
  const mime = String(file.type || "").toLowerCase();
  if (ALLOWED_MEDIA_MIME_TYPES.has(mime)) return true;
  const name = String(file.name || "").toLowerCase();
  return /\.(png|jpe?g|webp|gif)$/.test(name);
}

export function getImageUploadGuide(ruleKey) {
  const rule = IMAGE_UPLOAD_RULES[ruleKey];
  if (!rule) return { supported: "", recommended: "" };
  return {
    supported: `支援：PNG/JPG/WEBP/GIF，解析度不超過 ${rule.maxWidth}x${rule.maxHeight}，檔案 ${Math.round(rule.maxBytes / MB)}MB 內`,
    recommended: `建議：${rule.recommended}`,
  };
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("檔案不存在。"));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const width = Number(image.naturalWidth || 0);
      const height = Number(image.naturalHeight || 0);
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("無法讀取圖片尺寸。"));
    };
    image.src = objectUrl;
  });
}

export async function validateImageFile(file, ruleKey) {
  if (!isSupportedMediaFile(file)) {
    return { ok: false, error: "僅支援 PNG/JPG/WEBP/GIF 圖片檔案。" };
  }
  const rule = IMAGE_UPLOAD_RULES[ruleKey];
  if (!rule) return { ok: true, width: 0, height: 0 };
  if (Number(file.size || 0) > rule.maxBytes) {
    return { ok: false, error: `檔案過大，請控制在 ${Math.round(rule.maxBytes / MB)}MB 內。` };
  }
  try {
    const { width, height } = await readImageDimensions(file);
    if (width < rule.minWidth || height < rule.minHeight) {
      return {
        ok: true,
        width,
        height,
        warning: `解析度偏小（目前 ${width}x${height}），建議至少 ${rule.minWidth}x${rule.minHeight}。`,
      };
    }
    if (width > rule.maxWidth || height > rule.maxHeight) {
      return {
        ok: false,
        error: `解析度過大，請低於 ${rule.maxWidth}x${rule.maxHeight}。`,
      };
    }
    return { ok: true, width, height };
  } catch (error) {
    return { ok: false, error: error?.message || "無法讀取圖片資訊。" };
  }
}

export function estimateDataUrlBytes(dataUrl = "") {
  const text = String(dataUrl || "");
  const comma = text.indexOf(",");
  if (comma < 0) return text.length;
  const b64 = text.slice(comma + 1);
  return Math.floor((b64.length * 3) / 4);
}

export function readMediaLibrary() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  const raw = window.localStorage.getItem(MEDIA_LIBRARY_KEY);
  const items = safeParse(raw || "[]", []);
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && it.id && it.dataUrl)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function writeMediaLibrary(items) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(MEDIA_LIBRARY_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("media-library-updated"));
}

export function getMediaLibraryStats(maxBytes = DEFAULT_MAX_BYTES) {
  const items = readMediaLibrary();
  const usedBytes = items.reduce((sum, it) => sum + Number(it.sizeBytes || 0), 0);
  return {
    count: items.length,
    usedBytes,
    maxBytes,
    ratio: maxBytes > 0 ? Math.min(1, usedBytes / maxBytes) : 0,
  };
}

function buildItem({ dataUrl, name = "", source = "upload" }) {
  const sizeBytes = estimateDataUrlBytes(dataUrl);
  return {
    id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `media-${nowTs()}`,
    name: name || `image-${new Date().toISOString()}`,
    dataUrl,
    sizeBytes,
    source,
    createdAt: nowTs(),
  };
}

function upsertAndTrim(items, nextItem, maxBytes = DEFAULT_MAX_BYTES) {
  const deduped = items.filter((it) => it.dataUrl !== nextItem.dataUrl);
  const next = [nextItem, ...deduped];
  let total = next.reduce((sum, it) => sum + Number(it.sizeBytes || 0), 0);
  while (total > maxBytes && next.length > 1) {
    const removed = next.pop();
    total -= Number(removed?.sizeBytes || 0);
  }
  if (total > maxBytes && next.length === 1) {
    throw new Error("媒體檔案過大，超出媒體庫容量上限。");
  }
  return next;
}

export function addMediaDataUrl(dataUrl, options = {}) {
  const text = String(dataUrl || "").trim();
  if (!text) return null;
  const maxBytes = Number(options.maxBytes || DEFAULT_MAX_BYTES);
  const item = buildItem({
    dataUrl: text,
    name: options.name || "",
    source: options.source || "upload",
  });
  const current = readMediaLibrary();
  const updated = upsertAndTrim(current, item, maxBytes);
  writeMediaLibrary(updated);
  return item;
}

export function addMediaFile(file, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isSupportedMediaFile(file)) {
      reject(new Error("僅支援 PNG/JPG/WEBP/GIF 圖片檔案。"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (!dataUrl) throw new Error("讀取圖片失敗。");
        const item = addMediaDataUrl(dataUrl, {
          ...options,
          name: options.name || file.name,
          source: options.source || "upload",
        });
        resolve(item);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("讀取圖片失敗。"));
    reader.readAsDataURL(file);
  });
}

export function removeMediaItem(itemId) {
  const current = readMediaLibrary();
  const next = current.filter((it) => it.id !== itemId);
  writeMediaLibrary(next);
}

export function clearMediaLibrary() {
  writeMediaLibrary([]);
}

export function formatBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
