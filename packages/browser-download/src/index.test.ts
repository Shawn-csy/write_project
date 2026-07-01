/**
 * @write/browser-download unit tests.
 *
 * Covers:
 *   - sanitizeBaseFilename: spaces, special chars, leading/trailing underscores, empty/fallback
 *   - buildFilename: extension joining, dot-prefix strip
 *   - downloadText: creates Blob with correct content and triggers anchor click
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sanitizeBaseFilename, buildFilename, downloadText } from "./index";

// ---------------------------------------------------------------------------
// sanitizeBaseFilename
// ---------------------------------------------------------------------------

describe("sanitizeBaseFilename", () => {
  it("lowercases and replaces spaces with underscores", () => {
    expect(sanitizeBaseFilename("My Script Title")).toBe("my_script_title");
  });

  it("removes special chars", () => {
    // "Hello: World!" → lowercase → "hello: world!" → space→"_", colon/bang→"_"
    // → "hello__world_" → collapse "_+" → "hello_world_" → strip trailing → "hello_world"
    expect(sanitizeBaseFilename("Hello: World!")).toBe("hello_world");
  });

  it("collapses multiple underscores", () => {
    expect(sanitizeBaseFilename("a  b  c")).toBe("a_b_c");
  });

  it("strips leading and trailing underscores", () => {
    expect(sanitizeBaseFilename("__hello__")).toBe("hello");
  });

  it("returns fallback for empty string", () => {
    expect(sanitizeBaseFilename("")).toBe("file");
  });

  it("returns fallback for whitespace only", () => {
    expect(sanitizeBaseFilename("   ")).toBe("file");
  });

  it("uses custom fallback", () => {
    expect(sanitizeBaseFilename("", "script")).toBe("script");
  });
});

// ---------------------------------------------------------------------------
// buildFilename
// ---------------------------------------------------------------------------

describe("buildFilename", () => {
  it("produces sanitized base + extension", () => {
    expect(buildFilename("My Script", "txt")).toBe("my_script.txt");
  });

  it("strips leading dot from extension", () => {
    expect(buildFilename("doc", ".docx")).toBe("doc.docx");
  });

  it("returns just basename when extension is empty", () => {
    expect(buildFilename("report", "")).toBe("report");
  });
});

// ---------------------------------------------------------------------------
// downloadText — DOM interaction
// ---------------------------------------------------------------------------

describe("downloadText", () => {
  let createdBlob: Blob | null = null;
  let clickedHref: string | null = null;
  let clickedDownload: string | null = null;

  beforeEach(() => {
    createdBlob = null;
    clickedHref = null;
    clickedDownload = null;

    vi.stubGlobal("URL", {
      createObjectURL: (blob: Blob) => {
        createdBlob = blob;
        return "blob:mock-url";
      },
      revokeObjectURL: vi.fn(),
    });

    const fakeLink = {
      href: "",
      download: "",
      rel: "",
      style: { display: "" },
      click: vi.fn(() => {
        clickedHref = fakeLink.href;
        clickedDownload = fakeLink.download;
      }),
      remove: vi.fn(),
    };

    vi.spyOn(document, "createElement").mockReturnValue(fakeLink as unknown as HTMLElement);
    vi.spyOn(document.body, "appendChild").mockImplementation(() => fakeLink as unknown as Node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates Blob with provided content", () => {
    downloadText("hello world", "test.txt");
    expect(createdBlob).not.toBeNull();
    // Blob.text() not available in jsdom — verify size matches content byte length
    expect(createdBlob!.size).toBe(new TextEncoder().encode("hello world").length);
  });

  it("triggers anchor click with correct filename", () => {
    downloadText("content", "my_script.txt");
    expect(clickedDownload).toBe("my_script.txt");
  });

  it("sets href to blob url", () => {
    downloadText("content", "file.txt");
    expect(clickedHref).toBe("blob:mock-url");
  });

  it("handles empty content without throwing", () => {
    expect(() => downloadText("", "empty.txt")).not.toThrow();
  });
});
