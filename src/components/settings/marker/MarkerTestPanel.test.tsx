import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkerTestPanel } from "./MarkerTestPanel";

vi.mock("../../../contexts/I18nContext", () => ({
  useI18n: () => ({ t: (key: string, fallback = "") => fallback || key }),
}));
vi.mock("../../renderer/ScriptViewer", () => ({
  default: ({ text }: { text: string }) => <div>{text}</div>,
}));

describe("MarkerTestPanel", () => {
  it("renders the reading preview on the fixed light paper surface so dark ink stays visible in dark mode", () => {
    render(<MarkerTestPanel markerConfigs={[]} selectedConfig={null} />);
    const preview = screen.getByTestId("marker-test-preview");
    expect(preview.className).toContain("marker-test-paper");
    expect(preview.className).not.toContain("bg-background");
  });

  it("uses a 16px textarea on phones to avoid zoom and wraps its header controls", () => {
    render(<MarkerTestPanel markerConfigs={[]} selectedConfig={null} />);
    const textarea = screen.getByRole("textbox", { name: "試寫原稿" });
    expect(textarea.className).toContain("text-base");
    expect(textarea.className).toContain("sm:text-xs");
  });
});
