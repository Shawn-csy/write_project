import React from "react";
import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MarkerTestPanel } from "./MarkerTestPanel";

vi.mock("../../../contexts/I18nContext", () => ({
  useI18n: () => ({ t: (key: string, fallback = "") => key === "markerStudio.sample.effect" ? "開門聲" : fallback || key }),
}));
vi.mock("../../renderer/ScriptViewer", () => ({
  default: ({ text }: { text: string }) => <div>{text}</div>,
}));

beforeAll(() => vi.stubGlobal("ResizeObserver", class {
  observe() {}
  disconnect() {}
}));
afterAll(() => vi.unstubAllGlobals());

describe("MarkerTestPanel", () => {
  it("renders the output on the shared theme-aware preview surface", () => {
    render(<MarkerTestPanel markerConfigs={[]} selectedConfig={null} />);
    const preview = screen.getByTestId("marker-test-word-preview");
    expect(preview.className).toContain("marker-preview-surface");
    expect(preview.className).not.toContain("bg-background");
  });

  it("uses a 16px textarea on phones to avoid zoom and wraps its header controls", () => {
    render(<MarkerTestPanel markerConfigs={[]} selectedConfig={null} />);
    const textarea = screen.getByRole("textbox", { name: "試寫原稿" });
    expect(textarea.className).toContain("text-base");
    expect(textarea.className).toContain("sm:text-sm");
  });
  it("updates the generated sample with rule edits and shares it between Word and reader preview", () => {
    const rule = { id: "sample", label: "音效", matchMode: "prefix", start: "/sfx", productionWord: {
      target: "effect",
      symbol: "FX",
    } };
    const { rerender } = render(<MarkerTestPanel markerConfigs={[rule]} selectedConfig={rule} />);
    expect(screen.getByRole("textbox", { name: "試寫原稿" })).toHaveValue("/sfx 開門聲");
    expect(screen.getByTestId("marker-test-word-preview")).toHaveTextContent("FX");

    const updatedRule = { ...rule, start: "/fx" };
    rerender(<MarkerTestPanel markerConfigs={[updatedRule]} selectedConfig={updatedRule} />);
    expect(screen.getByRole("textbox", { name: "試寫原稿" })).toHaveValue("/fx 開門聲");
    expect(screen.getByTestId("marker-test-word-preview")).toHaveTextContent("FX");

    expect(screen.getByTestId("marker-test-reader-preview")).toHaveTextContent("/fx 開門聲");
  });

  it("preserves a custom sample while changing Word rules and offers reset after edits", () => {
    const rule = { id: "draft-reset", label: "音效", matchMode: "prefix", start: "/sfx" };
    const { rerender } = render(<MarkerTestPanel markerConfigs={[rule]} selectedConfig={rule} />);
    const field = screen.getByRole("textbox", { name: "試寫原稿" });
    expect(screen.queryByRole("button", { name: "markerStudio.resetSample" })).toBeNull();

    fireEvent.change(field, { target: { value: "/sfx 暴雨" } });
    const wordRule = { ...rule, productionWord: { target: "effect", symbol: "FX" } };
    rerender(<MarkerTestPanel markerConfigs={[wordRule]} selectedConfig={wordRule} />);
    expect(field).toHaveValue("/sfx 暴雨");
    expect(screen.getByTestId("marker-test-word-preview")).toHaveTextContent("暴雨");

    fireEvent.click(screen.getByRole("button", { name: "markerStudio.resetSample" }));
    expect(field).toHaveValue("/sfx 開門聲");
    expect(screen.queryByRole("button", { name: "markerStudio.resetSample" })).toBeNull();
  });

});
