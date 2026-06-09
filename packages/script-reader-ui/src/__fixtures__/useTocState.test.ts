import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTocState } from "../useTocState";

describe("useTocState", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useTocState());
    expect(result.current.isOpen).toBe(false);
  });

  it("open sets isOpen true", () => {
    const { result } = renderHook(() => useTocState());
    act(() => { result.current.open(); });
    expect(result.current.isOpen).toBe(true);
  });

  it("close sets isOpen false", () => {
    const { result } = renderHook(() => useTocState());
    act(() => { result.current.open(); });
    act(() => { result.current.close(); });
    expect(result.current.isOpen).toBe(false);
  });

  it("toggle flips isOpen", () => {
    const { result } = renderHook(() => useTocState());
    act(() => { result.current.toggle(); });
    expect(result.current.isOpen).toBe(true);
    act(() => { result.current.toggle(); });
    expect(result.current.isOpen).toBe(false);
  });

  it("stable callback refs across renders", () => {
    const { result, rerender } = renderHook(() => useTocState());
    const { open, close, toggle } = result.current;
    rerender();
    expect(result.current.open).toBe(open);
    expect(result.current.close).toBe(close);
    expect(result.current.toggle).toBe(toggle);
  });
});
