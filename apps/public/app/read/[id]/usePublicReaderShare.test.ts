import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePublicReaderShare } from "./usePublicReaderShare";

const MOCK_URL = "https://example.com/read/test-id";

beforeEach(() => {
  Object.defineProperty(window, "location", {
    value: { href: MOCK_URL },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePublicReaderShare", () => {
  it("clipboard success → copied becomes true then resets", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePublicReaderShare());
    expect(result.current.copied).toBe(false);

    await act(async () => {
      result.current.handleShare();
    });
    // flush promise microtasks
    await act(async () => { await Promise.resolve(); });

    expect(writeText).toHaveBeenCalledWith(MOCK_URL);
    expect(result.current.copied).toBe(true);

    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it("clipboard reject → window.prompt fallback, copied stays false", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    const prompt = vi.spyOn(window, "prompt").mockReturnValue(null);

    const { result } = renderHook(() => usePublicReaderShare());
    await act(async () => {
      result.current.handleShare();
      await Promise.resolve();
      await Promise.resolve(); // let rejection propagate
    });

    expect(prompt).toHaveBeenCalledWith("複製連結：", MOCK_URL);
    expect(result.current.copied).toBe(false);
  });

  it("clipboard absent → window.prompt fallback", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const prompt = vi.spyOn(window, "prompt").mockReturnValue(null);

    const { result } = renderHook(() => usePublicReaderShare());
    await act(async () => { result.current.handleShare(); });

    expect(prompt).toHaveBeenCalledWith("複製連結：", MOCK_URL);
    expect(result.current.copied).toBe(false);
  });
});
