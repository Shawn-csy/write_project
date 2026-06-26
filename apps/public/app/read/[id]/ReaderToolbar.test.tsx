import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReaderToolbar } from "./ReaderToolbar";

vi.mock("@write/script-reader-ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@write/script-reader-ui")>();
  return {
    ...actual,
    ReaderToolbar: ({ startSlot, centerSlot, endSlot, contentClassName }: {
      startSlot?: React.ReactNode;
      centerSlot?: React.ReactNode;
      endSlot?: React.ReactNode;
      contentClassName?: string;
    }) => (
      <div data-testid="shared-toolbar" data-content-class={contentClassName}>{startSlot}{centerSlot}{endSlot}</div>
    ),
  };
});

const fakeState = {} as Parameters<typeof ReaderToolbar>[0]["readerState"];

describe("ReaderToolbar", () => {
  it("does not render appearance menu", () => {
    render(<ReaderToolbar readerState={fakeState} />);
    expect(screen.queryByRole("button", { name: "外觀設定" })).toBeNull();
  });

  it("does not render info menu", () => {
    render(<ReaderToolbar readerState={fakeState} />);
    expect(screen.queryByRole("button", { name: "說明與平台資訊" })).toBeNull();
  });

  it("renders back link", () => {
    render(<ReaderToolbar readerState={fakeState} />);
    expect(screen.getByRole("link", { name: /台本列表/ })).toBeTruthy();
  });

  it("renders share and PDF buttons when provided", () => {
    render(
      <ReaderToolbar
        readerState={fakeState}
        onShare={vi.fn()}
        onExportPdf={vi.fn()}
        pdfReady
      />
    );
    expect(screen.getByRole("button", { name: "分享" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PDF" })).toBeTruthy();
  });

  it("renders title in center slot", () => {
    render(<ReaderToolbar readerState={fakeState} title="測試台本" />);
    expect(screen.getByText("測試台本")).toBeTruthy();
  });

  it("passes full-width contentClassName (not reading-content max-width)", () => {
    render(<ReaderToolbar readerState={fakeState} />);
    const toolbar = screen.getByTestId("shared-toolbar");
    const cls = toolbar.dataset.contentClass ?? "";
    expect(cls).toContain("w-full");
    expect(cls).not.toContain("max-w-");
  });
});
