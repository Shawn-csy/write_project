/**
 * PublicReaderHeader navigation tests.
 *
 * Covers:
 *   - author links to /author/:personaId when persona.id present
 *   - author is plain text when only owner (no persona.id)
 *   - org links to /org/:orgId when org.id present
 *   - series links to /series/:name
 *   - tags link to /tag/:name
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { PublicReaderHeader } from "./PublicReaderHeader";
import type { PublicReaderActions } from "./usePublicReaderActions";

const ACTIONS: PublicReaderActions = {
  views: 5,
  likes: 1,
  liked: false,
  likeInFlight: false,
  copied: false,
  canDownload: false,
  handleLike: () => {},
  handleShare: () => {},
  handleDownloadTxt: () => {},
};

const BASE_SCRIPT = {
  id: "s1",
  title: "Test Script",
};

describe("PublicReaderHeader navigation", () => {
  it("author links to /author/:personaId when persona.id present", () => {
    render(
      <PublicReaderHeader
        script={{ ...BASE_SCRIPT, persona: { id: "p1", displayName: "Alice" } }}
        actions={ACTIONS}
      />
    );
    const link = screen.getByRole("link", { name: "Alice" });
    expect(link.getAttribute("href")).toBe("/author/p1");
  });

  it("no author link when only owner (no persona.id)", () => {
    render(
      <PublicReaderHeader
        script={{ ...BASE_SCRIPT, owner: { displayName: "Bob" } }}
        actions={ACTIONS}
      />
    );
    // Owner without persona.id should not produce an /author/ link
    expect(screen.queryByRole("link", { name: "Bob" })).toBeNull();
    // But name should still appear in the document
    expect(screen.getByText(/Bob/)).toBeTruthy();
  });

  it("org links to /org/:orgId", () => {
    render(
      <PublicReaderHeader
        script={{ ...BASE_SCRIPT, organization: { id: "org1", name: "Studio A" } }}
        actions={ACTIONS}
      />
    );
    const link = screen.getByRole("link", { name: "Studio A" });
    expect(link.getAttribute("href")).toBe("/org/org1");
  });

  it("series links to /series/:name", () => {
    render(
      <PublicReaderHeader
        script={{ ...BASE_SCRIPT, series: { name: "Epic Series" } }}
        actions={ACTIONS}
      />
    );
    const link = screen.getByRole("link", { name: "Epic Series" });
    expect(link.getAttribute("href")).toBe("/series/Epic%20Series");
  });

  it("tags link to /tag/:name", () => {
    render(
      <PublicReaderHeader
        script={{
          ...BASE_SCRIPT,
          tags: [{ name: "Drama" }, { name: "Comedy" }],
        }}
        actions={ACTIONS}
      />
    );
    expect(screen.getByRole("link", { name: "Drama" }).getAttribute("href")).toBe("/tag/Drama");
    expect(screen.getByRole("link", { name: "Comedy" }).getAttribute("href")).toBe("/tag/Comedy");
  });
});
