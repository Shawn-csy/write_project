import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResourcePageClient } from "./ResourcePageClient";
import type { ProductionResource } from "../ResourcesClient";
import { liveApi } from "@/lib/liveApi";

const resource: ProductionResource = {
  id: "credit-123", name: "製作人甲", categories: ["post_production", "cover_art"],
  summary: "音聲製作與插畫", websiteUrl: "", sourceUrl: "", reviewedAt: 1,
  avatarUrl: "https://example.com/avatar.jpg", profileUrl: "https://x.com/creator",
  profileLabel: "X", links: [{ label: "作品集", url: "https://example.com/portfolio" }],
  works: [{ id: "work-1", title: "作品甲", url: "https://example.com/work", coverUrl: "https://example.com/cover.jpg", creditRole: "post_production", creditedAs: "製作人甲" }],
};

describe("ResourcePageClient", () => {
  it("shows the resource identity and contact links, then reveals credited works", () => {
    render(<ResourcePageClient item={resource} />);
    expect(screen.getByRole("heading", { name: "製作人甲" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "X" }).getAttribute("href")).toBe("https://x.com/creator");
    expect(screen.getByRole("link", { name: "作品集" }).getAttribute("href")).toBe("https://example.com/portfolio");
    expect(screen.queryByRole("link", { name: "前往作品：作品甲" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "我已年滿 18 歲，顯示作品" }));
    expect(screen.getByRole("link", { name: "前往作品：作品甲" }).getAttribute("href")).toBe("https://example.com/work");
  });

  it("sends a profile contribution to the moderation queue", async () => {
    const write = vi.spyOn(liveApi, "write").mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    try {
      render(<ResourcePageClient item={resource} />);
      fireEvent.click(screen.getByRole("button", { name: "補充／更新資源資料" }));
      fireEvent.change(screen.getByLabelText("資料補充者名稱（公開顯示）"), { target: { value: "協作者" } });
      fireEvent.change(screen.getByLabelText("聯絡姓名（不公開）"), { target: { value: "訪客" } });
      fireEvent.change(screen.getByLabelText("聯絡 Email（不公開）"), { target: { value: "visitor@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "送交審核" }));
      await waitFor(() => expect(write).toHaveBeenCalled());
      const payload = JSON.parse(String(write.mock.calls[0][1]?.body));
      expect(payload.resourceId).toBe("credit-123");
      expect(payload.contributorName).toBe("協作者");
      expect(screen.getByRole("status").textContent).toContain("已送交審核");
    } finally {
      write.mockRestore();
    }
  });
});
