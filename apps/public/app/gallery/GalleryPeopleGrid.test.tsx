import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GalleryAuthorGrid, GalleryOrgGrid } from "./GalleryPeopleGrid";

describe("GalleryAuthorGrid", () => {
  it("renders loading state", () => {
    render(<GalleryAuthorGrid authors={[]} filteredAuthors={[]} loading />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("renders author links from filtered ids", () => {
    render(
      <GalleryAuthorGrid
        loading={false}
        authors={[
          { id: "p1", displayName: "Author One", bio: "Bio" },
          { id: "p2", displayName: "Hidden Author" },
        ]}
        filteredAuthors={[{ id: "p1", displayName: "Author One" }]}
      />
    );

    expect(screen.getByRole("link", { name: /Author One/ }).getAttribute("href")).toBe(
      "/author/p1"
    );
    expect(screen.queryByText("Hidden Author")).toBeNull();
  });

  it("renders empty author state", () => {
    render(<GalleryAuthorGrid authors={[]} filteredAuthors={[]} loading={false} />);
    expect(screen.getByText("找不到符合的作者")).toBeTruthy();
  });
});

describe("GalleryOrgGrid", () => {
  it("renders organization links from filtered ids", () => {
    render(
      <GalleryOrgGrid
        loading={false}
        orgs={[
          { id: "o1", name: "Org One", description: "Description" },
          { id: "o2", name: "Hidden Org" },
        ]}
        filteredOrgs={[{ id: "o1", name: "Org One" }]}
      />
    );

    expect(screen.getByRole("link", { name: /Org One/ }).getAttribute("href")).toBe(
      "/org/o1"
    );
    expect(screen.queryByText("Hidden Org")).toBeNull();
  });

  it("renders empty org state", () => {
    render(<GalleryOrgGrid orgs={[]} filteredOrgs={[]} loading={false} />);
    expect(screen.getByText("找不到符合的組織")).toBeTruthy();
  });
});
