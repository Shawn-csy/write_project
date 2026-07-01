import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GalleryAuthorGrid, GalleryOrgGrid } from "./GalleryPeopleGrid";

const noopTag = () => {};
const noopReset = () => {};

// ─── GalleryAuthorGrid ────────────────────────────────────────────────────────

describe("GalleryAuthorGrid", () => {
  it("idle → loading indicator", () => {
    render(<GalleryAuthorGrid authors={[]} filteredAuthors={[]} peopleStatus="idle" onRetry={() => {}} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("loading → loading indicator", () => {
    render(<GalleryAuthorGrid authors={[]} filteredAuthors={[]} peopleStatus="loading" onRetry={() => {}} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("error → error message + retry button", async () => {
    const retry = vi.fn();
    render(<GalleryAuthorGrid authors={[]} filteredAuthors={[]} peopleStatus="error" onRetry={retry} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
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
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
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
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    expect(screen.getByText("找不到符合的作者")).toBeTruthy();
  });

  it("tag chips render and call onToggleTag on click", async () => {
    const toggle = vi.fn();
    render(
      <GalleryAuthorGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        authors={[{ id: "p1", displayName: "Author One", tags: ["配音"] }]}
        filteredAuthors={[{ id: "p1", displayName: "Author One" }]}
        allTags={["配音", "劇本"]}
        selectedTags={[]}
        onToggleTag={toggle}
        onResetFilters={noopReset}
      />
    );
    const chip = screen.getAllByRole("button", { name: "配音" })[0];
    await userEvent.click(chip);
    expect(toggle).toHaveBeenCalledWith("配音");
  });

  it("active tag chip shows clear-filter button", () => {
    render(
      <GalleryAuthorGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        authors={[]}
        filteredAuthors={[]}
        allTags={["配音"]}
        selectedTags={["配音"]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    expect(screen.getByRole("button", { name: /清除篩選/ })).toBeTruthy();
  });
});

// ─── GalleryOrgGrid ───────────────────────────────────────────────────────────

describe("GalleryOrgGrid", () => {
  it("idle → loading indicator", () => {
    render(<GalleryOrgGrid orgs={[]} filteredOrgs={[]} peopleStatus="idle" onRetry={() => {}} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("loading → loading indicator", () => {
    render(<GalleryOrgGrid orgs={[]} filteredOrgs={[]} peopleStatus="loading" onRetry={() => {}} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("error → error message + retry button", async () => {
    const retry = vi.fn();
    render(<GalleryOrgGrid orgs={[]} filteredOrgs={[]} peopleStatus="error" onRetry={retry} allTags={[]} selectedTags={[]} onToggleTag={noopTag} onResetFilters={noopReset} />);
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
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
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
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    expect(screen.getByText("找不到符合的組織")).toBeTruthy();
  });

  it("tag chips render and call onToggleTag on click", async () => {
    const toggle = vi.fn();
    render(
      <GalleryOrgGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        orgs={[{ id: "o1", name: "Org One", tags: ["活動"] }]}
        filteredOrgs={[{ id: "o1", name: "Org One" }]}
        allTags={["活動"]}
        selectedTags={[]}
        onToggleTag={toggle}
        onResetFilters={noopReset}
      />
    );
    const chip = screen.getAllByRole("button", { name: "活動" })[0];
    await userEvent.click(chip);
    expect(toggle).toHaveBeenCalledWith("活動");
  });

  it("org card with website has no nested anchor inside org link", () => {
    render(
      <GalleryOrgGrid
        peopleStatus="loaded"
        onRetry={() => {}}
        orgs={[{ id: "o1", name: "Org One", website: "https://example.com" }]}
        filteredOrgs={[{ id: "o1", name: "Org One" }]}
        allTags={[]}
        selectedTags={[]}
        onToggleTag={noopTag}
        onResetFilters={noopReset}
      />
    );
    const orgLink = screen.getByRole("link", { name: /Org One/ });
    // website link must NOT be a descendant of the org anchor
    const nestedAnchors = orgLink.querySelectorAll("a");
    expect(nestedAnchors.length).toBe(0);
    // website link must exist as a sibling/cousin, not nested
    const websiteLink = screen.getByRole("link", { name: /example\.com/ });
    expect(websiteLink).toBeTruthy();
  });
});
