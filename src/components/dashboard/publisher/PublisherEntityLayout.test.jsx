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
