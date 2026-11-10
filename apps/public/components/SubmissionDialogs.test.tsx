import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const write = vi.fn();
vi.mock("@/lib/liveApi", () => ({ liveApi: { write: (...args: unknown[]) => write(...args) } }));

import { AudioWorkSubmissionDialog } from "./AudioWorkSubmissionDialog";
import { AudioWorkAdApplicationDialog } from "./AudioWorkAdApplicationDialog";

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
});
