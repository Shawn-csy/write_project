import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResourcesClient, type ProductionResource } from "./ResourcesClient";

const base = {
  categories: ["post_production"], summary: "", websiteUrl: "https://example.com/",
  sourceUrl: "https://example.com/", reviewedAt: 1,
} satisfies Omit<ProductionResource, "id" | "name" | "works" | "categories"> & { categories: ProductionResource["categories"] };

describe("ResourcesClient", () => {
  it("shows verified voice actor profile links on the card", () => {
    render(<ResourcesClient initialPersonas={[{
      id: "actor-1", displayName: "一介", avatar: "https://example.com/avatar.jpg",
      roles: ["voice_actor"], links: [{ label: "X", url: "https://x.com/heyiam_1J" }],
    }]} initialResources={[]} />);
    const profile = screen.getByRole("link", { name: "一介的X" });
    expect(profile.getAttribute("href")).toBe("https://x.com/heyiam_1J");
    expect(profile.getAttribute("target")).toBe("_blank");
  });

  it("hides production resources without a credited work in the selected category", () => {
    const resources: ProductionResource[] = [
      { ...base, id: "empty", name: "沒有作品", works: [] },
      { ...base, id: "listed", name: "有作品", works: [{ id: "work-1", title: "作品甲", url: "https://example.com/work", coverUrl: "", creditRole: "post_production", creditedAs: "有作品" }] },
    ];
    render(<ResourcesClient initialPersonas={[]} initialResources={resources} />);
    fireEvent.click(screen.getByRole("button", { name: "後製" }));
    expect(screen.getByText("1 筆")).toBeTruthy();
    expect(screen.getByText("有作品")).toBeTruthy();
    expect(screen.queryByText("沒有作品")).toBeNull();
  });

  it("shows resource avatars and contact links before revealing work covers", () => {
    render(<ResourcesClient initialPersonas={[]} initialResources={[{
      ...base, id: "studio", name: "韾笙重工", avatarUrl: "https://example.com/avatar.jpg",
      profileUrl: "https://www.youtube.com/@oseizyuukou", profileLabel: "YouTube",
      links: [{ label: "X", url: "https://x.com/oseizyuukou" }],
      works: [{ id: "work-1", title: "作品甲", url: "https://example.com/work", coverUrl: "https://example.com/cover.jpg", creditRole: "post_production", creditedAs: "韾笙重工" }],
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: "後製" }));
    expect(screen.getByAltText("韾笙重工").getAttribute("src")).toBe("https://example.com/avatar.jpg");
    expect(screen.getByRole("link", { name: "X" }).getAttribute("href")).toBe("https://x.com/oseizyuukou");
    expect(screen.queryByAltText("作品甲封面")).toBeNull();
  });
});
