import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SeriesAttachScriptDialog } from "./SeriesAttachScriptDialog";
import type { BaseScriptApi } from "../../../types/api";

// radix-ui Dialog uses portals; jsdom needs this stubbed
vi.mock("../../ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeScript(id: string, title: string): BaseScriptApi {
  return { id, title } as BaseScriptApi;
}

const SCRIPTS = [
  makeScript("s1", "Alpha"),
  makeScript("s2", "Beta"),
  makeScript("s3", "Gamma"),
];

function renderDialog(
  scripts: BaseScriptApi[] = SCRIPTS,
  onAttachScript = vi.fn(),
  onOpenChange = vi.fn()
) {
  render(
    <SeriesAttachScriptDialog
      open={true}
      onOpenChange={onOpenChange}
      seriesId="series1"
      attachableScripts={scripts}
      onAttachScript={onAttachScript}
    />
  );
  return { onAttachScript, onOpenChange };
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("shows dialog when open=true", () => {
    renderDialog();
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("lists all attachable scripts", () => {
    renderDialog();
    expect(screen.getByRole("option", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Beta" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Gamma" })).toBeInTheDocument();
  });

  it("shows empty state when no scripts", () => {
    renderDialog([]);
    expect(screen.getByText("無符合的作品")).toBeInTheDocument();
  });
});

// ─── Search filter ────────────────────────────────────────────────────────────

describe("search filter", () => {
  it("filters list by search text (case-insensitive)", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("搜尋作品"), { target: { value: "alp" } });
    expect(screen.getByRole("option", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Beta" })).not.toBeInTheDocument();
  });

  it("shows empty state when search matches nothing", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("搜尋作品"), { target: { value: "zzz" } });
    expect(screen.getByText("無符合的作品")).toBeInTheDocument();
  });

  it("clears selection when search changes", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
    fireEvent.change(screen.getByLabelText("搜尋作品"), { target: { value: "b" } });
    // confirm button now disabled (no selection)
    expect(screen.getByRole("button", { name: "加入" })).toBeDisabled();
  });
});

// ─── Selection ────────────────────────────────────────────────────────────────

describe("selection", () => {
  it("enables confirm button after selecting a script", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "加入" })).toBeDisabled();
    fireEvent.click(screen.getByRole("option", { name: "Beta" }));
    expect(screen.getByRole("button", { name: "加入" })).not.toBeDisabled();
  });

  it("marks clicked item as selected (aria-selected)", () => {
    renderDialog();
    const option = screen.getByRole("option", { name: "Alpha" });
    expect(option).toHaveAttribute("aria-selected", "false");
    fireEvent.click(option);
    expect(option).toHaveAttribute("aria-selected", "true");
  });
});

// ─── Order input ──────────────────────────────────────────────────────────────

describe("order input", () => {
  it("shows error for invalid order (float)", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("章節順序"), { target: { value: "1.5" } });
    expect(screen.getByText(/請輸入整數/)).toBeInTheDocument();
  });

  it("disables confirm button while order is invalid", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
    fireEvent.change(screen.getByLabelText("章節順序"), { target: { value: "bad" } });
    expect(screen.getByRole("button", { name: "加入" })).toBeDisabled();
  });

  it("re-enables confirm button after fixing invalid order", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
    fireEvent.change(screen.getByLabelText("章節順序"), { target: { value: "bad" } });
    fireEvent.change(screen.getByLabelText("章節順序"), { target: { value: "3" } });
    expect(screen.getByRole("button", { name: "加入" })).not.toBeDisabled();
  });
});

// ─── Confirm ──────────────────────────────────────────────────────────────────

describe("confirm", () => {
  it("calls onAttachScript with scriptId, seriesId, and parsed order", () => {
    const { onAttachScript } = renderDialog();
    fireEvent.click(screen.getByRole("option", { name: "Beta" }));
    fireEvent.change(screen.getByLabelText("章節順序"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "加入" }));
    expect(onAttachScript).toHaveBeenCalledWith("s2", "series1", 2);
  });

  it("calls onAttachScript with null order when order field is empty", () => {
    const { onAttachScript } = renderDialog();
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "加入" }));
    expect(onAttachScript).toHaveBeenCalledWith("s1", "series1", null);
  });

  it("calls onOpenChange(false) after confirm", () => {
    const { onOpenChange } = renderDialog();
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "加入" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets form after confirm (search cleared)", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("搜尋作品"), { target: { value: "alp" } });
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "加入" }));
    // After close/reset search is cleared → re-render with open=true would show all scripts
    // We verify the search input is cleared
    expect((screen.getByLabelText("搜尋作品") as HTMLInputElement).value).toBe("");
  });
});

// ─── Cancel ───────────────────────────────────────────────────────────────────

describe("cancel", () => {
  it("calls onOpenChange(false) on cancel", () => {
    const { onOpenChange } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does NOT call onAttachScript on cancel", () => {
    const { onAttachScript } = renderDialog();
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onAttachScript).not.toHaveBeenCalled();
  });
});
