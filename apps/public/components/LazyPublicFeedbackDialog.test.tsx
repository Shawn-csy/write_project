import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LazyPublicFeedbackDialog } from "./LazyPublicFeedbackDialog";

describe("LazyPublicFeedbackDialog", () => {
  it("keeps the trigger available and opens the form on demand", async () => {
    render(<LazyPublicFeedbackDialog mode="bug" />);
    expect(screen.getByRole("button", { name: "回報問題" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "回報問題" }));
    expect(await screen.findByRole("dialog", { name: "回報問題" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "關閉回報表單" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens through the mobile action sheet's controlled state", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<LazyPublicFeedbackDialog mode="bug" hideTrigger open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<LazyPublicFeedbackDialog mode="bug" hideTrigger open onOpenChange={onOpenChange} />);
    expect(await screen.findByRole("dialog", { name: "回報問題" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "關閉回報表單" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
