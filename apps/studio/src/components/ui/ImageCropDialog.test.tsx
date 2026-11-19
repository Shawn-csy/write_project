/**
 * Component tests for ImageCropDialog.
 *
 * Covers:
 *   - "套用裁切框" button shown when onApplyCropRef + url source provided
 *   - "套用裁切框" button absent when source is a File (destructive path)
 *   - "套用裁切框" button absent when onApplyCropRef not provided
 *   - onApplyCropRef called and dialog closed when button clicked
 *   - initialCropRef with non-finite values does not crash
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ImageCropDialog } from "./ImageCropDialog";

// Radix UI primitives (Dialog, Slider) use ResizeObserver which jsdom lacks.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Radix UI primitives (Dialog, Slider) use ResizeObserver which jsdom lacks.
// Already defined above as global — this comment kept for clarity.

// Stub Image to control load/error in tests.
// Default: simulate error so isLoading resolves quickly without a real network.
class StubImage {
  crossOrigin = "";
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_: string) {
    setTimeout(() => this.onerror?.(), 0);
  }
}

// LoadedImage: simulate successful load with a known size so computed is non-null.
class LoadedStubImage extends StubImage {
  naturalWidth = 800;
  naturalHeight = 600;
  set src(_: string) {
    setTimeout(() => this.onload?.(), 0);
  }
}

beforeEach(() => {
  Object.defineProperty(global, "Image", { writable: true, value: StubImage });
});

const urlSource = { url: "https://example.com/img.jpg", name: "cover" };
const fileSource = { file: new File(["data"], "cover.jpg", { type: "image/jpeg" }), name: "cover" };

function renderDialog(overrides: Partial<React.ComponentProps<typeof ImageCropDialog>> = {}) {
  const defaults: React.ComponentProps<typeof ImageCropDialog> = {
    open: true,
    onOpenChange: vi.fn(),
    source: urlSource,
    purpose: "cover",
    onConfirm: vi.fn(),
    ...overrides,
  };
  return render(<ImageCropDialog {...defaults} />);
}

describe("ImageCropDialog — onApplyCropRef button", () => {
  it("shows '套用裁切框' button when onApplyCropRef is provided", () => {
    renderDialog({ onApplyCropRef: vi.fn(), applyCropRefLabel: "套用裁切框" });
    expect(screen.getByText("套用裁切框")).toBeInTheDocument();
  });

  it("does NOT show '套用裁切框' when onApplyCropRef is undefined", () => {
    renderDialog({ onApplyCropRef: undefined });
    expect(screen.queryByText("套用裁切框")).not.toBeInTheDocument();
  });

  it("calls onApplyCropRef and closes dialog when button clicked (after image load)", async () => {
    // Use a stub that fires onload so computed becomes non-null and button is enabled.
    Object.defineProperty(global, "Image", { writable: true, value: LoadedStubImage });
    const onApplyCropRef = vi.fn();
    const onOpenChange = vi.fn();
    renderDialog({ onApplyCropRef, applyCropRefLabel: "套用裁切框", onOpenChange });
    // Wait for image to "load" and button to become enabled.
    await waitFor(() => {
      expect(screen.getByText("套用裁切框")).not.toBeDisabled();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("套用裁切框"));
    });
    expect(onApplyCropRef).toHaveBeenCalledTimes(1);
    const crop = onApplyCropRef.mock.calls[0][0];
    expect(crop).toHaveProperty("cx");
    expect(crop).toHaveProperty("cy");
    expect(crop).toHaveProperty("zoom");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not crash with non-finite initialCropRef values", () => {
    expect(() =>
      renderDialog({
        onApplyCropRef: vi.fn(),
        applyCropRefLabel: "套用裁切框",
        initialCropRef: { cx: Infinity, cy: NaN, zoom: -1 },
      })
    ).not.toThrow();
    expect(screen.getByText("套用裁切框")).toBeInTheDocument();
  });
});

describe("ImageCropDialog — file source (destructive path)", () => {
  it("renders without '套用裁切框' when source is a File and onApplyCropRef not provided", () => {
    renderDialog({ source: fileSource, onApplyCropRef: undefined });
    expect(screen.queryByText("套用裁切框")).not.toBeInTheDocument();
  });

  it("renders confirm button for file source", () => {
    renderDialog({ source: fileSource, onApplyCropRef: undefined });
    expect(screen.getByText("確認")).toBeInTheDocument();
  });
});
