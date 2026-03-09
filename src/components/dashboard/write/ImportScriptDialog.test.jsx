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

  it("opens format quick info and toggles detail rules", () => {
    render(
      <ImportScriptDialog
        open={true}
        onOpenChange={vi.fn()}
        onImport={vi.fn()}
        currentPath="/"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "importDialog.formatGuide" }));
    expect(screen.getByText("importDialog.formatQuickTitle")).toBeInTheDocument();
    expect(screen.getByText("importFormat.markerCol")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "importDialog.formatGuideDetail" }));
    expect(screen.getByText("importFormat.nameCol")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "收合" })).toBeInTheDocument();
  });
});
