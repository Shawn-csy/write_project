import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const write = vi.fn();
vi.mock("@/lib/liveApi", () => ({
  liveApi: {
    readJson: vi.fn().mockResolvedValue({ data: { personas: [], scripts: [], externalPublicScripts: [] } }),
    write: (...args: unknown[]) => write(...args),
  },
}));

import { PublicFeedbackDialog } from "./PublicFeedbackDialog";

async function openDialog() {
  const user = userEvent.setup();
  render(<PublicFeedbackDialog />);
  await user.click(screen.getByRole("button", { name: /回報或台本投稿/ }));
  return user;
}

describe("PublicFeedbackDialog", () => {
  beforeEach(() => {
    write.mockReset();
    write.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  it("starts with two separate entry paths instead of a mixed form", async () => {
    await openDialog();
    expect(screen.getByRole("button", { name: /回報問題/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /投稿台本/ })).toBeTruthy();
    expect(screen.queryByLabelText("問題描述")).toBeNull();
    expect(screen.queryByLabelText("台本名稱")).toBeNull();
  });

  it("bug path shows the problem form only and submits a bug", async () => {
    const user = await openDialog();
    await user.click(screen.getByRole("button", { name: /回報問題/ }));
    expect(screen.queryByLabelText("台本名稱")).toBeNull();
    await user.type(screen.getByLabelText("聯絡名稱"), "小明");
    await user.type(screen.getByLabelText("問題描述"), "按鈕壞掉了喔");
    await user.click(screen.getByRole("button", { name: "送出回報" }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    const body = JSON.parse((write.mock.calls[0][1] as { body: string }).body);
    expect(body.kind).toBe("bug");
  });

  it("listing path is stepwise and validates each step before moving on", async () => {
    const user = await openDialog();
    await user.click(screen.getByRole("button", { name: /投稿台本/ }));
    expect(screen.getByRole("list", { name: "投稿步驟" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    expect((await screen.findByRole("alert")).textContent).toContain("台本名稱");

    await user.type(screen.getByLabelText("台本名稱"), "測試台本");
    await user.selectOptions(screen.getByLabelText("台本師"), "__custom__");
    await user.type(screen.getByLabelText("自訂作者名稱"), "作者甲");
    await user.type(screen.getByLabelText("台本文件連結"), "https://example.com/doc");
    await user.click(screen.getByRole("button", { name: "下一步" }));
    expect(screen.getByRole("listitem", { current: "step" }).textContent).toContain("細節");

    await user.click(screen.getByRole("button", { name: "下一步" }));
    expect(screen.getByRole("button", { name: "送出投稿" })).toBeTruthy();

    // contact info is required on the last step
    await user.click(screen.getByRole("button", { name: "送出投稿" }));
    expect((await screen.findByRole("alert")).textContent).toContain("聯絡");
    expect(write).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("聯絡名稱"), "小明");
    await user.click(screen.getByRole("button", { name: "送出投稿" }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    const body = JSON.parse((write.mock.calls[0][1] as { body: string }).body);
    expect(body.kind).toBe("listing");
    expect(body.scriptTitle).toBe("測試台本");
  });
});
