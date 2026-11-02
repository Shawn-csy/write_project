import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicEmptyState } from "./PublicEmptyState";
import { PublicCardGridSkeleton, PublicListSkeleton } from "./PublicSkeleton";

describe("PublicEmptyState", () => {
  it("renders title, description and next-step actions", () => {
    const onClick = vi.fn();
    render(
      <PublicEmptyState
        title="沒有結果"
        description="試試別的關鍵字"
        primaryAction={{ label: "清除篩選", onClick }}
        secondaryAction={{ label: "回首頁", href: "/" }}
      />
    );
    expect(screen.getByText("沒有結果")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "清除篩選" }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "回首頁" }).getAttribute("href")).toBe("/");
  });
});

describe("PublicSkeleton", () => {
  it("announces loading for grids and lists", () => {
    const { unmount } = render(<PublicCardGridSkeleton count={3} />);
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("載入中...")).toBeTruthy();
    unmount();
    render(<PublicListSkeleton rows={2} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });
});
