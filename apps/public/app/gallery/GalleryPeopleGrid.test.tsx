import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GalleryAuthorGrid, GalleryOrgGrid } from "./GalleryPeopleGrid";

// ─── GalleryAuthorGrid ────────────────────────────────────────────────────────

describe("GalleryAuthorGrid", () => {
  it("idle → loading indicator", () => {
    render(<GalleryAuthorGrid authors={[]} filteredAuthors={[]} peopleStatus="idle" onRetry={() => {}} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("loading → loading indicator", () => {
    render(<GalleryAuthorGrid authors={[]} filteredAuthors={[]} peopleStatus="loading" onRetry={() => {}} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("error → error message + retry button", async () => {
    const retry = vi.fn();
    render(<GalleryAuthorGrid authors={[]} filteredAuthors={[]} peopleStatus="error" onRetry={retry} />);
    expect(screen.getByText("載入失敗")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "重試" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("loaded + data → renders matched author cards", () => {
    render(
      <GalleryAuthorGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        authors={[
          { id: "p1", displayName: "Author One", bio: "Bio" },
          { id: "p2", displayName: "Hidden Author" },
        ]}
        filteredAuthors={[{ id: "p1", displayName: "Author One" }]}
      />
    );
    expect(screen.getByRole("link", { name: /Author One/ }).getAttribute("href")).toBe("/author/p1");
    expect(screen.queryByText("Hidden Author")).toBeNull();
  });

  it("loaded + empty filteredAuthors → empty message", () => {
    render(
      <GalleryAuthorGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        authors={[{ id: "p1", displayName: "Author One" }]}
        filteredAuthors={[]}
      />
    );
    expect(screen.getByText("找不到符合的作者")).toBeTruthy();
  });
});

// ─── GalleryOrgGrid ───────────────────────────────────────────────────────────

describe("GalleryOrgGrid", () => {
  it("idle → loading indicator", () => {
    render(<GalleryOrgGrid orgs={[]} filteredOrgs={[]} peopleStatus="idle" onRetry={() => {}} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("loading → loading indicator", () => {
    render(<GalleryOrgGrid orgs={[]} filteredOrgs={[]} peopleStatus="loading" onRetry={() => {}} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("error → error message + retry button", async () => {
    const retry = vi.fn();
    render(<GalleryOrgGrid orgs={[]} filteredOrgs={[]} peopleStatus="error" onRetry={retry} />);
    expect(screen.getByText("載入失敗")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "重試" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("loaded + data → renders matched org cards", () => {
    render(
      <GalleryOrgGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        orgs={[
          { id: "o1", name: "Org One", description: "Description" },
          { id: "o2", name: "Hidden Org" },
        ]}
        filteredOrgs={[{ id: "o1", name: "Org One" }]}
      />
    );
    expect(screen.getByRole("link", { name: /Org One/ }).getAttribute("href")).toBe("/org/o1");
    expect(screen.queryByText("Hidden Org")).toBeNull();
  });

  it("loaded + empty filteredOrgs → empty message", () => {
    render(
      <GalleryOrgGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        orgs={[{ id: "o1", name: "Org One" }]}
        filteredOrgs={[]}
      />
    );
    expect(screen.getByText("找不到符合的組織")).toBeTruthy();
  });
});
