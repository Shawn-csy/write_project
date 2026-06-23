import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReaderToolbar } from "./ReaderToolbar";

vi.mock("@write/script-reader-ui", () => ({
  ReaderToolbar: ({ endSlot }: { endSlot?: React.ReactNode }) => (
    <div data-testid="shared-toolbar">{endSlot}</div>
  ),
}));

vi.mock("lucide-react", () => ({
  CircleHelp: () => <span data-testid="circle-help-icon" />,
  SlidersHorizontal: () => <span data-testid="sliders-icon" />,
  Sun: () => null,
  Moon: () => null,
  Monitor: () => null,
}));

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

const fakeState = {} as Parameters<typeof ReaderToolbar>[0]["readerState"];

describe("ReaderToolbar", () => {
  it("renders shared appearance menu trigger", () => {
    render(<ReaderToolbar readerState={fakeState} />);
    expect(screen.getByRole("button", { name: "外觀設定" })).toBeTruthy();
  });

  it("renders shared info menu trigger", () => {
    render(<ReaderToolbar readerState={fakeState} />);
    expect(screen.getByRole("button", { name: "說明與平台資訊" })).toBeTruthy();
  });

  it("share and PDF buttons unaffected", () => {
    const onShare = vi.fn();
    const onExportPdf = vi.fn();
    render(
      <ReaderToolbar
        readerState={fakeState}
        onShare={onShare}
        onExportPdf={onExportPdf}
        pdfReady
      />
    );
    expect(screen.getByRole("button", { name: "分享" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PDF" })).toBeTruthy();
  });
});
