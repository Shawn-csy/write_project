import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebouncedAutosave } from "./useDebouncedAutosave";

describe("useDebouncedAutosave", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps a stable timer and runs the latest callback", () => {
    vi.useFakeTimers();
    const firstSave = vi.fn();
    const latestSave = vi.fn();

    const { rerender } = renderHook(
      ({ enabled, save }) =>
        useDebouncedAutosave({
          enabled,
          delayMs: 500,
          save,
        }),
      { initialProps: { enabled: true, save: firstSave } }
    );

    vi.advanceTimersByTime(300);
    rerender({ enabled: true, save: latestSave });
    vi.advanceTimersByTime(199);

    expect(firstSave).not.toHaveBeenCalled();
    expect(latestSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(firstSave).not.toHaveBeenCalled();
    expect(latestSave).toHaveBeenCalledTimes(1);
  });
});
