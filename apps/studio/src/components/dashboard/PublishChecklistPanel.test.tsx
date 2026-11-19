import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const jump = vi.fn();
let checklist: Record<string, unknown> = {};

vi.mock("./metadata/ScriptMetadataDialogContext", () => ({
  ScriptMetadataDialogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFormContext: () => ({}),
  useUIContext: () => ({}),
  useStatusContext: () => ({ status: "Private" }),
  useChecklistContext: () => checklist,
  buildPublishChecklist: () => ({}),
}));
vi.mock("../studio/StudioShellContext", () => ({ useStudioShell: () => ({ openMobileMenu: vi.fn() }) }));

import { PublishChecklistPanel } from "./ScriptMetadataDialog";

const req = (ok: boolean[]) => ok.map((v, i) => ({ key: `r${i}`, label: `必填${i}`, ok: v }));
const rec = (ok: boolean[]) => ok.map((v, i) => ({ key: `c${i}`, label: `建議${i}`, ok: v }));

describe("PublishChecklistPanel", () => {
  it("reports required progress separately from recommended items", () => {
    checklist = {
      requiredChecklist: req([true, true, true, true, true]),
      recommendedChecklist: rec([false, false, true]),
      completedChecklistItems: 5, totalChecklistItems: 5, completionPercent: 100,
      completedRecommendedItems: 1, totalRecommendedItems: 3,
      handleJumpToChecklistItem: jump,
    };
    render(<PublishChecklistPanel />);
    expect(screen.getByText("必填資料已完成")).toBeInTheDocument();
    expect(screen.getByText("必填 5 / 5")).toBeInTheDocument();
    expect(screen.queryByText(/7 \/ 8/)).toBeNull();
    expect(screen.getByText("建議補充（不影響公開）")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("shows missing required steps first and jumps to the field", () => {
    checklist = {
      requiredChecklist: req([true, false, false, true, true]),
      recommendedChecklist: rec([false]),
      completedChecklistItems: 3, totalChecklistItems: 5, completionPercent: 60,
      completedRecommendedItems: 0, totalRecommendedItems: 1,
      handleJumpToChecklistItem: jump,
    };
    render(<PublishChecklistPanel />);
    expect(screen.getByText("還差 2 項必填")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /前往填寫/ })[0]);
    expect(jump).toHaveBeenCalledWith("r1");
  });
});
