import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScriptMetadataChecklistHeader } from "./ScriptMetadataChecklistHeader";

describe("ScriptMetadataChecklistHeader", () => {
  it("keeps missing-field shortcuts without duplicating accordion navigation", () => {
    const focusSection = vi.fn();

    render(
      <ScriptMetadataChecklistHeader
        t={(key, fallback) => fallback || key}
        completedChecklistItems={0}
        totalChecklistItems={3}
        completionPercent={0}
        hasBlockingIssues={false}
        visibleChecklistChipItems={[{type: "required", key: "audience", label: "觀眾取向"}]}
        showAllChecklistChips={false}
        hiddenChecklistChipCount={0}
        checklistChipItems={[]}
        maxVisibleChecklistChips={4}
        activeTab="demo"
        jumpToChecklistItem={focusSection}
        setShowAllChecklistChips={vi.fn()}
        focusSection={focusSection}
      />
    );

    expect(screen.queryByRole("button", { name: /試聽範例/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "觀眾取向" }));
    expect(focusSection).toHaveBeenCalledWith("audience");
  });
});
