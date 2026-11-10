import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const write = vi.fn();
vi.mock("@/lib/liveApi", () => ({ liveApi: { write: (...args: unknown[]) => write(...args) } }));

import { AudioWorkSubmissionDialog } from "./AudioWorkSubmissionDialog";
import { AudioWorkAdApplicationDialog } from "./AudioWorkAdApplicationDialog";
import { ResourceSubmissionDialog } from "./ResourceSubmissionDialog";

describe("public submission forms", () => {
  beforeEach(() => {
    write.mockReset();
    write.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it("sends an audio work for review with public display consent", async () => {
    const user = userEvent.setup();
    render(<AudioWorkSubmissionDialog />);
    await user.click(screen.getByRole("button", { name: "投稿作品" }));
    await user.type(screen.getByLabelText("作品名稱"), "測試音聲");
    await user.type(screen.getByLabelText("作品或試聽連結"), "https://example.com/work");
    await user.type(screen.getByLabelText("創作者／團隊"), "測試團隊");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "送出審核" }));
    await waitFor(() => expect(write).toHaveBeenCalledOnce());
    expect(write.mock.calls[0][0]).toBe("/api/public-audio-work-submissions");
    expect(JSON.parse(write.mock.calls[0][1].body)).toMatchObject({
      title: "測試音聲", creatorName: "測試團隊", confirmPublic: true,
    });
    expect(screen.getByRole("status")).toHaveTextContent("審核通過後會公開");
  });

  it("stops an ad application with an end date before its start", async () => {
    const user = userEvent.setup();
    render(<AudioWorkAdApplicationDialog />);
    await user.click(screen.getByRole("button", { name: "投稿廣告" }));
    await user.type(screen.getByLabelText("活動／品牌名稱"), "測試活動");
    await user.type(screen.getByLabelText("聯絡人"), "投稿者");
    await user.type(screen.getByLabelText("聯絡 Email"), "writer@example.com");
    await user.type(screen.getByLabelText("導流網址"), "https://example.com");
    await user.type(screen.getByLabelText("廣告圖片網址"), "https://example.com/banner.png");
    await user.type(screen.getByLabelText("開始日期（選填）"), "2026-12-10");
    await user.type(screen.getByLabelText("結束日期（選填）"), "2026-12-01");
    await user.click(screen.getByRole("button", { name: "送出審核" }));
    expect(screen.getByRole("alert")).toHaveTextContent("結束日期不能早於開始日期");
    expect(write).not.toHaveBeenCalled();
  });

  it("keeps partially filled resource works from silently disappearing", async () => {
    const user = userEvent.setup();
    render(<ResourceSubmissionDialog defaultCategory="cover_art" />);
    await user.click(screen.getByRole("button", { name: "投稿資源" }));
    await user.type(screen.getByLabelText("名稱"), "測試封面師");
    await user.type(screen.getByLabelText("官方／委託頁網址"), "https://example.com/artist");
    await user.type(screen.getByLabelText("作品名稱 1"), "有名稱但沒網址");
    await user.type(screen.getByLabelText("投稿人稱呼"), "測試人");
    await user.type(screen.getByLabelText("聯絡 Email（不公開）"), "helper@example.com");
    await user.click(screen.getByRole("button", { name: "送出審核" }));
    expect(screen.getByRole("alert")).toHaveTextContent("已填寫的參與作品都需要作品網址");
    expect(write).not.toHaveBeenCalled();
  });
});
