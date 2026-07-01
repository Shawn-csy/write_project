import { describe, expect, it } from "vitest";
import {
  CARD_SUMMARY_MAX_CHARS,
  normalizeCardText,
  normalizeOutlineText,
  truncateCardText,
} from "../gallery/cardText";

describe("normalizeCardText", () => {
  it("collapses multiple spaces", () => {
    expect(normalizeCardText("a  b   c")).toBe("a b c");
  });

  it("collapses newlines to spaces", () => {
    expect(normalizeCardText("a\nb\n\nc")).toBe("a b c");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalizeCardText("  hello  ")).toBe("hello");
  });

  it("handles non-string input", () => {
    expect(normalizeCardText(null)).toBe("");
    expect(normalizeCardText(undefined)).toBe("");
    expect(normalizeCardText(42)).toBe("42");
  });
});

describe("normalizeOutlineText", () => {
  it("preserves single blank lines (paragraph breaks)", () => {
    const input = "Act 1\n\nAct 2";
    expect(normalizeOutlineText(input)).toBe("Act 1\n\nAct 2");
  });

  it("collapses 3+ blank lines to double newline", () => {
    const input = "Act 1\n\n\n\nAct 2";
    expect(normalizeOutlineText(input)).toBe("Act 1\n\nAct 2");
  });

  it("normalizes CRLF to LF", () => {
    expect(normalizeOutlineText("a\r\nb\r\nc")).toBe("a\nb\nc");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalizeOutlineText("\n\ntext\n\n")).toBe("text");
  });

  it("does NOT collapse internal single newlines", () => {
    const input = "line 1\nline 2\nline 3";
    expect(normalizeOutlineText(input)).toBe("line 1\nline 2\nline 3");
  });
});

describe("truncateCardText", () => {
  it("returns short text unchanged", () => {
    expect(truncateCardText("short")).toBe("short");
  });

  it("truncates long text and appends '...'", () => {
    const long = "A".repeat(100);
    const result = truncateCardText(long);
    expect(result).toMatch(/\.\.\.$/);
    expect(result.length).toBeLessThanOrEqual(CARD_SUMMARY_MAX_CHARS + 3);
    expect(result).not.toBe(long);
  });

  it("respects custom maxChars", () => {
    const result = truncateCardText("Hello world", 5);
    expect(result).toBe("Hello...");
  });

  it("does not add '...' when text length exactly equals maxChars", () => {
    const exact = "A".repeat(CARD_SUMMARY_MAX_CHARS);
    expect(truncateCardText(exact)).toBe(exact);
    expect(truncateCardText(exact)).not.toMatch(/\.\.\./);
  });
});
