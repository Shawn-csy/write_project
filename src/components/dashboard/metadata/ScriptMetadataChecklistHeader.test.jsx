import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScriptMetadataChecklistHeader } from "./ScriptMetadataChecklistHeader";

describe("ScriptMetadataChecklistHeader", () => {
  it("renders activity/demo section buttons and highlights demo as active", () => {
    const focusSection = vi.fn();

    render(
      <ScriptMetadataChecklistHeader
        t={(key, fallback) => fallback || key}
        completedChecklistItems={0}
        totalChecklistItems={3}
        completionPercent={0}
        hasBlockingIssues={false}
        visibleChecklistChipItems={[]}
        showAllChecklistChips={false}
        hiddenChecklistChipCount={0}
        checklistChipItems={[]}
        maxVisibleChecklistChips={4}
        activeTab="demo"
        jumpToChecklistItem={vi.fn()}
        setShowAllChecklistChips={vi.fn()}
        focusSection={focusSection}
      />
    );

    const demoButton = screen.getByRole("button", { name: /試聽範例/i });
    const activityButton = screen.getByRole("button", { name: /活動宣傳/i });

    expect(demoButton.className).toContain("ring-2");
    expect(activityButton.className).toContain("hover:bg-muted/60");

    fireEvent.click(demoButton);
    expect(focusSection).toHaveBeenCalledWith("demo");
  });
});
