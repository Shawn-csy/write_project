import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  PublisherSplitPanel,
  PublisherEntityListPane,
  PublisherEntityListItem,
  PublisherEmptyState,
  PublisherActionBar,
} from "./PublisherEntityLayout";

describe("PublisherEntityLayout", () => {
  it("switches mobile panes while retaining an unsaved form", () => {
    render(<PublisherSplitPanel
      sidebar={<PublisherEntityListItem title="系列 A" onClick={() => {}} />}
      header="編輯系列">
      <input aria-label="系列名稱" defaultValue="原名稱" />
    </PublisherSplitPanel>);
    fireEvent.click(screen.getByRole("button", { name: "系列 A" }));
    const panel = document.querySelector('[data-mobile-view]');
    expect(panel).toHaveAttribute("data-mobile-view", "editor");
    fireEvent.change(screen.getByLabelText("系列名稱"), { target: { value: "未儲存名稱" } });
    fireEvent.click(screen.getByRole("button", { name: "返回列表" }));
    expect(panel).toHaveAttribute("data-mobile-view", "list");
    fireEvent.click(screen.getByRole("button", { name: "系列 A" }));
    expect(screen.getByLabelText("系列名稱")).toHaveValue("未儲存名稱");
  });

  it("keeps the list open when a selection requires confirmation", () => {
    render(<PublisherSplitPanel
      sidebar={<PublisherEntityListItem title="其他系列" onClick={() => false} />}
      header="編輯系列"><div>表單</div></PublisherSplitPanel>);
    fireEvent.click(screen.getByRole("button", { name: "其他系列" }));
    expect(document.querySelector('[data-mobile-view]')).toHaveAttribute("data-mobile-view", "list");
  });
  it("renders split panel with sidebar/header/content/footer", () => {
    render(
      <PublisherSplitPanel
        sidebar={<div>SIDEBAR</div>}
        header={<div>HEADER</div>}
        footer={<div>FOOTER</div>}
      >
        <div>CONTENT</div>
      </PublisherSplitPanel>
    );

    expect(screen.getByText("SIDEBAR")).toBeInTheDocument();
    expect(screen.getByText("HEADER")).toBeInTheDocument();
    expect(screen.getByText("CONTENT")).toBeInTheDocument();
    expect(screen.getByText("FOOTER")).toBeInTheDocument();
  });

  it("handles list pane create action and loading text", () => {
    const onCreate = vi.fn();

    render(
      <PublisherEntityListPane
        title="清單"
        onCreate={onCreate}
        createAriaLabel="新增項目"
        isLoading
        loadingLabel="載入中"
      >
        <PublisherEntityListItem title="項目 A" onClick={vi.fn()} />
      </PublisherEntityListPane>
    );

    expect(screen.getByText("清單")).toBeInTheDocument();
    expect(screen.getByText("載入中")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("新增項目"));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("renders empty state and action button", () => {
    const onAction = vi.fn();

    render(
      <PublisherEmptyState
        title="尚無資料"
        description="請先新增內容"
        actionLabel="立即新增"
        onAction={onAction}
      />
    );

    expect(screen.getByText("尚無資料")).toBeInTheDocument();
    expect(screen.getByText("請先新增內容")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "立即新增" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders action bar id and children", () => {
    render(
      <PublisherActionBar id="save-bar">
        <button type="button">儲存</button>
      </PublisherActionBar>
    );

    const bar = document.getElementById("save-bar");
    expect(bar).toBeTruthy();
    expect(screen.getByRole("button", { name: "儲存" })).toBeInTheDocument();
  });
});
