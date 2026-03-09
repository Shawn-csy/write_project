import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PublicHelpPage from "./PublicHelpPage";

vi.mock("../contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key, fallback = "") => fallback || key,
  }),
}));

vi.mock("../components/public/PublicTopBar", () => ({
  PublicTopBar: ({ title }) => <div data-testid="public-topbar">{title}</div>,
}));

describe("PublicHelpPage", () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <PublicHelpPage />
      </MemoryRouter>
    );

  it("renders faq search with default result count", () => {
    renderPage();

    expect(screen.getByPlaceholderText("搜尋問題，例如：如何公開、匯入格式、授權條款")).toBeInTheDocument();
    expect(screen.getByText("找到 8 筆相關問題")).toBeInTheDocument();
    expect(screen.getAllByText("我要怎麼把作品公開到公開台本？").length).toBeGreaterThan(0);
  });

  it("filters faq results by keyword and shows empty state", () => {
    renderPage();

    const searchInput = screen.getByPlaceholderText("搜尋問題，例如：如何公開、匯入格式、授權條款");
    fireEvent.change(searchInput, { target: { value: "不存在的關鍵字" } });

    expect(screen.getByText("找到 0 筆相關問題")).toBeInTheDocument();
    expect(screen.getByText("找不到符合「不存在的關鍵字」的問題，請換個關鍵字試試。")).toBeInTheDocument();
  });

  it("expands and collapses faq answer", () => {
    renderPage();

    const question = screen.getAllByRole("button", { name: /我要怎麼把作品公開到公開台本/ })[1];
    fireEvent.click(question);
    expect(
      screen.getByText("到發佈工作室開啟作品，點選「編輯資訊」，完成公開狀態、授權、封面與必要欄位後儲存，即可在公開台本被搜尋與閱讀。")
    ).toBeInTheDocument();

    fireEvent.click(question);
    expect(
      screen.queryByText("到發佈工作室開啟作品，點選「編輯資訊」，完成公開狀態、授權、封面與必要欄位後儲存，即可在公開台本被搜尋與閱讀。")
    ).not.toBeInTheDocument();
  });

  it("opens import quick dialog and toggles detail table", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "publicHelp.importFormatCta" }));
    expect(screen.getByText("publicHelp.importQuickTitle")).toBeInTheDocument();
    expect(screen.getByText("importFormat.markerCol")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "publicHelp.importFormatDetailCta" }));
    expect(screen.getByText("importFormat.nameCol")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "收合" })).toBeInTheDocument();
  });
});
