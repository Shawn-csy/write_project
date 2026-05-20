import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebouncedAutosave } from "./useDebouncedAutosave";

describe("useDebouncedAutosave", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces saves and only runs the latest callback", () => {
    vi.useFakeTimers();
    const firstSave = vi.fn();
    const latestSave = vi.fn();

    const { rerender } = renderHook(
      ({ enabled, save, value }) =>
        useDebouncedAutosave({
          enabled,
          delayMs: 500,
          save,
          deps: [value],
        }),
      { initialProps: { enabled: true, save: firstSave, value: "a" } }
    );

    vi.advanceTimersByTime(300);
    rerender({ enabled: true, save: latestSave, value: "b" });
    vi.advanceTimersByTime(499);

    expect(firstSave).not.toHaveBeenCalled();
    expect(latestSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(firstSave).not.toHaveBeenCalled();
    expect(latestSave).toHaveBeenCalledTimes(1);
  });
});
