import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResourcePageClient } from "./ResourcePageClient";
import type { ProductionResource } from "../ResourcesClient";

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
});
