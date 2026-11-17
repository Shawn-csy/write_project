import React, { useState } from "react";
import type { GalleryViewMode } from "@write/public-ui";
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GalleryViewModeToggle } from "./GalleryViewModeToggle";

function ModeControl({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState<GalleryViewMode>("standard");
  return <GalleryViewModeToggle value={value} onChange={setValue} compact={compact} />;
}

describe("GalleryViewModeToggle", () => {
  it.each([false, true])("toggles both ways with one button (compact=%s)", (compact) => {
    render(<ModeControl compact={compact} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    const standard = screen.getByRole("button", { name: "切換為密集顯示" });
    expect(standard.textContent).toBe("標準");
    expect(standard.getAttribute("title")).toBe("切換為密集顯示");
    fireEvent.click(standard);
    const dense = screen.getByRole("button", { name: "切換為標準顯示" });
    expect(dense.textContent).toBe("密集");
    expect(dense.getAttribute("title")).toBe("切換為標準顯示");
    fireEvent.click(dense);
    expect(screen.getByRole("button", { name: "切換為密集顯示" }).textContent).toBe("標準");
  });
});
