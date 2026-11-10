import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ImportScriptDialog } from "./ImportScriptDialog";

vi.mock("../../../contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key, fallback = "") => fallback || key,
  }),
}));

vi.mock("../../ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("../../common/SpotlightGuideOverlay", () => ({
  SpotlightGuideOverlay: () => null,
}));

describe("ImportScriptDialog", () => {
  beforeEach(() => {
    localStorage.setItem("import-guide-seen-v1", "1");
  });

  it("requires script content before preprocessing", () => {
    render(
      <ImportScriptDialog
        open={true}
        onOpenChange={vi.fn()}
        onImport={vi.fn()}
        currentPath="/"
      />
    );

    const next = screen.getByRole("button", { name: "importDialog.nextPreprocess" });
    expect(next).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("importStageInput.contentPlaceholder"), {
      target: { value: "第一幕\n角色：台詞" },
    });
    expect(next).not.toBeDisabled();
  });
});
