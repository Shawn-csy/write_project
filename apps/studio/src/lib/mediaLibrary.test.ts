import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addMediaDataUrl,
  addMediaFile,
  clearMediaLibrary,
  estimateDataUrlBytes,
  formatBytes,
  getImageUploadGuide,
  getMediaLibraryStats,
  isSupportedMediaFile,
  optimizeImageForUpload,
  readMediaLibrary,
  removeMediaItem,
  validateImageFile,
} from "./mediaLibrary";

function makeDataUrl(raw = "hello") {
  const b64 = btoa(raw);
  return `data:image/png;base64,${b64}`;
}

describe("mediaLibrary", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("supports expected image types including gif", () => {
    expect(isSupportedMediaFile({ type: "image/gif", name: "a.gif" })).toBe(true);
    expect(isSupportedMediaFile({ type: "image/webp", name: "a.webp" })).toBe(true);
    expect(isSupportedMediaFile({ type: "application/pdf", name: "a.pdf" })).toBe(false);
  });

  it("can infer support from filename extension", () => {
    expect(isSupportedMediaFile({ type: "", name: "cover.GIF" })).toBe(true);
    expect(isSupportedMediaFile({ type: "", name: "cover.txt" })).toBe(false);
  });

  it("stores and reads latest media first", () => {
    const first = addMediaDataUrl(makeDataUrl("a"), { name: "a.png" });
    const second = addMediaDataUrl(makeDataUrl("b"), { name: "b.png" });
    const items = readMediaLibrary();
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(second.id);
    expect(items[1].id).toBe(first.id);
  });

  it("deduplicates same dataUrl", () => {
    const url = makeDataUrl("same");
    addMediaDataUrl(url, { name: "first.png" });
    addMediaDataUrl(url, { name: "second.png" });
    const items = readMediaLibrary();
    expect(items).toHaveLength(1);
  });

  it("can remove items and clear all", () => {
    const one = addMediaDataUrl(makeDataUrl("1"), { name: "1.png" });
    addMediaDataUrl(makeDataUrl("2"), { name: "2.png" });
    removeMediaItem(one.id);
    expect(readMediaLibrary()).toHaveLength(1);
    clearMediaLibrary();
    expect(readMediaLibrary()).toHaveLength(0);
  });

  it("returns stats and byte format helpers", () => {
    addMediaDataUrl(makeDataUrl("abc"), { name: "a.png" });
    const stats = getMediaLibraryStats(1024);
    expect(stats.count).toBe(1);
    expect(stats.usedBytes).toBeGreaterThan(0);
    expect(formatBytes(100)).toBe("100 B");
    expect(formatBytes(2048)).toContain("KB");
  });

  it("estimates dataUrl bytes", () => {
    const url = makeDataUrl("abcdef");
    expect(estimateDataUrlBytes(url)).toBeGreaterThan(0);
  });

  it("returns upload guide text", () => {
    const cover = getImageUploadGuide("cover");
    expect(cover.supported).toContain("PNG/JPG/WEBP/GIF");
    expect(cover.recommended).toContain("1200 x 630");
  });

  it("validateImageFile rejects unsupported type", async () => {
    const result = await validateImageFile({ type: "text/plain", name: "a.txt", size: 10 }, "cover");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("PNG/JPG/WEBP/GIF");
  });

  it("validateImageFile rejects oversize file", async () => {
    const result = await validateImageFile(
      { type: "image/png", name: "a.png", size: 20 * 1024 * 1024 },
      "cover"
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("8MB");
  });

  it("validateImageFile validates dimensions", async () => {
    const originalImage = global.Image;
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;

    class FakeImage {
      constructor() {
        this.naturalWidth = 1200;
        this.naturalHeight = 630;
        this.onload = null;
        this.onerror = null;
      }
      set src(_) {
        setTimeout(() => this.onload && this.onload(), 0);
      }
    }

    global.Image = FakeImage;
    URL.createObjectURL = vi.fn(() => "blob://fake");
    URL.revokeObjectURL = vi.fn();

    const result = await validateImageFile(
      { type: "image/png", name: "a.png", size: 100 * 1024 },
      "cover"
    );
    expect(result.ok).toBe(true);
    expect(result.width).toBe(1200);
    expect(result.height).toBe(630);

    global.Image = originalImage;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it("validateImageFile allows smaller dimensions with warning", async () => {
    const originalImage = global.Image;
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;

    class FakeImage {
      constructor() {
        this.naturalWidth = 320;
        this.naturalHeight = 180;
        this.onload = null;
        this.onerror = null;
      }
      set src(_) {
        setTimeout(() => this.onload && this.onload(), 0);
      }
    }

    global.Image = FakeImage;
    URL.createObjectURL = vi.fn(() => "blob://fake");
    URL.revokeObjectURL = vi.fn();

    const result = await validateImageFile(
      { type: "image/png", name: "small.png", size: 100 * 1024 },
      "cover"
    );
    expect(result.ok).toBe(true);
    expect(result.warning).toContain("建議至少 640x360");

    global.Image = originalImage;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it("optimizeImageForUpload converts image to webp and keeps warning", async () => {
    const originalImage = global.Image;
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const originalFileReader = global.FileReader;
    const originalCreateElement = document.createElement.bind(document);

    class FakeImage {
      constructor() {
        this.naturalWidth = 320;
        this.naturalHeight = 180;
        this.onload = null;
        this.onerror = null;
      }
      set src(_) {
        setTimeout(() => this.onload && this.onload(), 0);
      }
    }

    class FakeFileReader {
      constructor() {
        this.result = null;
        this.onload = null;
        this.onerror = null;
      }
      readAsDataURL() {
        this.result = "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==";
        setTimeout(() => this.onload && this.onload(), 0);
      }
    }

    global.Image = FakeImage;
    global.FileReader = FakeFileReader;
    URL.createObjectURL = vi.fn(() => "blob://fake");
    URL.revokeObjectURL = vi.fn();

    const canvasMock = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      toBlob: vi.fn((callback, _type, quality) => {
        const size = quality > 0.7 ? 1_200_000 : 700_000;
        callback(new Blob([new Uint8Array(size)], { type: "image/webp" }));
      }),
      toDataURL: vi.fn(() => "data:image/webp;base64,ZmFrZQ=="),
    };
    vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
      if (tagName === "canvas") return canvasMock;
      return originalCreateElement(tagName, options);
    });

    const file = new File([new Uint8Array([1, 2, 3])], "sample.gif", { type: "image/gif" });
    const result = await optimizeImageForUpload(file, "cover");

    expect(result.ok).toBe(true);
    expect(result.file.type).toBe("image/webp");
    expect(result.file.name.endsWith(".webp")).toBe(true);
    expect(result.warning).toContain("建議至少 640x360");
    expect(canvasMock.toBlob).toHaveBeenCalled();

    document.createElement.mockRestore();
    global.Image = originalImage;
    global.FileReader = originalFileReader;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it("addMediaFile stores optimized webp item", async () => {
    const originalImage = global.Image;
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const originalFileReader = global.FileReader;
    const originalCreateElement = document.createElement.bind(document);

    class FakeImage {
      constructor() {
        this.naturalWidth = 1200;
        this.naturalHeight = 630;
        this.onload = null;
        this.onerror = null;
      }
      set src(_) {
        setTimeout(() => this.onload && this.onload(), 0);
      }
    }

    class FakeFileReader {
      constructor() {
        this.result = null;
        this.onload = null;
        this.onerror = null;
      }
      readAsDataURL() {
        this.result = "data:image/png;base64,ZmFrZQ==";
        setTimeout(() => this.onload && this.onload(), 0);
      }
    }

    global.Image = FakeImage;
    global.FileReader = FakeFileReader;
    URL.createObjectURL = vi.fn(() => "blob://fake");
    URL.revokeObjectURL = vi.fn();

    const canvasMock = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      toBlob: vi.fn((callback) => {
        callback(new Blob([new Uint8Array(100_000)], { type: "image/webp" }));
      }),
      toDataURL: vi.fn(() => "data:image/webp;base64,ZmFrZQ=="),
    };
    vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
      if (tagName === "canvas") return canvasMock;
      return originalCreateElement(tagName, options);
    });

    const file = new File([new Uint8Array([9, 8, 7])], "origin.png", { type: "image/png" });
    const item = await addMediaFile(file);

    expect(item).toBeTruthy();
    expect(item.name.endsWith(".webp")).toBe(true);
    expect(readMediaLibrary()[0].dataUrl.startsWith("data:image/webp")).toBe(true);

    document.createElement.mockRestore();
    global.Image = originalImage;
    global.FileReader = originalFileReader;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });
});
