import { describe, it, expect, vi, beforeEach } from "vitest";
import { sanitizeBaseFilename, buildFilename, downloadText } from "./download";

// ── sanitizeBaseFilename ───────────────────────────────────────────────────

describe("sanitizeBaseFilename", () => {
  it("converts spaces to underscores", () => {
    expect(sanitizeBaseFilename("my script")).toBe("my_script");
  });

  it("lowercases the result", () => {
    expect(sanitizeBaseFilename("MyScript")).toBe("myscript");
  });

  it("replaces invalid characters with underscores and collapses runs", () => {
    // "file!@#.name" → invalid chars → "file____name" → collapse → "file_name"
    expect(sanitizeBaseFilename("file!@#.name")).toBe("file_name");
  });

  it("collapses multiple underscores into one", () => {
    expect(sanitizeBaseFilename("a  b")).toBe("a_b");
  });

  it("strips leading and trailing underscores", () => {
    expect(sanitizeBaseFilename("  hello  ")).toBe("hello");
  });

  it("returns fallback for empty string", () => {
    expect(sanitizeBaseFilename("")).toBe("file");
    expect(sanitizeBaseFilename("   ")).toBe("file");
  });

  it("returns fallback for string of only invalid chars", () => {
    expect(sanitizeBaseFilename("!!!")).toBe("file");
  });

  it("uses custom fallback", () => {
    expect(sanitizeBaseFilename("", "script")).toBe("script");
  });

  it("preserves hyphens and underscores", () => {
    expect(sanitizeBaseFilename("my-script_v2")).toBe("my-script_v2");
  });

  it("handles Chinese characters (replaces with underscore)", () => {
    const result = sanitizeBaseFilename("我的劇本");
    expect(result).toBe("file");
  });
});

// ── buildFilename ──────────────────────────────────────────────────────────

describe("buildFilename", () => {
  it("combines base name and extension", () => {
    expect(buildFilename("my script", "fountain")).toBe("my_script.fountain");
  });

  it("strips leading dots from extension", () => {
    expect(buildFilename("script", ".txt")).toBe("script.txt");
  });

  it("returns just base name when extension is empty", () => {
    expect(buildFilename("script", "")).toBe("script");
  });

  it("handles undefined extension", () => {
    expect(buildFilename("script", undefined)).toBe("script");
  });
});

// ── downloadText ───────────────────────────────────────────────────────────

describe("downloadText", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
    vi.useFakeTimers();
  });

  it("creates and clicks a download link", () => {
    const link = {
      href: "",
      download: "",
      rel: "",
      style: { display: "" },
      click: vi.fn(),
      remove: vi.fn(),
    };
    const appendSpy = vi.spyOn(document.body, "appendChild").mockReturnValue(link);
    vi.spyOn(document, "createElement").mockReturnValue(link);

    downloadText("hello", "test.txt");

    expect(link.download).toBe("test.txt");
    expect(link.click).toHaveBeenCalled();
    expect(link.remove).toHaveBeenCalled();

    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    appendSpy.mockRestore();
    vi.useRealTimers();
  });
});
