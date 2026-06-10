/**
 * ScriptCard navigation link tests.
 *
 * Covers:
 *   - title and cover link to /read/:id
 *   - author link to /author/:personaId when persona.id present
 *   - no author link when only owner (no persona.id)
 *   - series link to /series/:name
 *   - org link to /org/:id when no series
 *   - tags link to /tag/:name
 *   - no tag links when no tags
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ScriptCard } from "./ScriptCard";

const BASE = {
  id: "s1",
  title: "My Script",
};

describe("ScriptCard links", () => {
  it("title links to /read/:id", () => {
    render(<ScriptCard script={BASE} />);
    const links = screen.getAllByRole("link", { name: /My Script/i });
    expect(links.some((l) => l.getAttribute("href") === "/read/s1")).toBe(true);
  });

  it("cover area links to /read/:id", () => {
    render(<ScriptCard script={BASE} />);
    const links = screen.getAllByRole("link");
    expect(links.some((l) => l.getAttribute("href") === "/read/s1")).toBe(true);
  });

  it("author links to /author/:personaId when persona.id present", () => {
    render(
      <ScriptCard script={{ ...BASE, persona: { id: "p1", displayName: "Alice" } }} />
    );
    const link = screen.getByRole("link", { name: "Alice" });
    expect(link.getAttribute("href")).toBe("/author/p1");
  });

  it("no author link when only owner present (no persona.id)", () => {
    render(
      <ScriptCard script={{ ...BASE, owner: { id: "o1", displayName: "Bob" } }} />
    );
    // Owner without persona.id should not produce an /author/ link
    expect(screen.queryByRole("link", { name: "Bob" })).toBeNull();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("series links to /series/:name", () => {
    render(
      <ScriptCard script={{ ...BASE, series: { name: "Epic Series" } }} />
    );
    const link = screen.getByRole("link", { name: "Epic Series" });
    expect(link.getAttribute("href")).toBe("/series/Epic%20Series");
  });

  it("org links to /org/:id when no series", () => {
    render(
      <ScriptCard script={{ ...BASE, organization: { id: "org1", name: "Studio A" } }} />
    );
    const link = screen.getByRole("link", { name: "Studio A" });
    expect(link.getAttribute("href")).toBe("/org/org1");
  });

  it("org not shown when series present", () => {
    render(
      <ScriptCard
        script={{
          ...BASE,
          series: { name: "My Series" },
          organization: { id: "org1", name: "Studio A" },
        }}
      />
    );
    expect(screen.queryByRole("link", { name: "Studio A" })).toBeNull();
  });

  it("tags link to /tag/:name", () => {
    render(
      <ScriptCard
        script={{ ...BASE, tags: [{ name: "Drama" }, { name: "Romance" }] }}
      />
    );
    const dramaLink = screen.getByRole("link", { name: "Drama" });
    const romanceLink = screen.getByRole("link", { name: "Romance" });
    expect(dramaLink.getAttribute("href")).toBe("/tag/Drama");
    expect(romanceLink.getAttribute("href")).toBe("/tag/Romance");
  });

  it("encodes special chars in tag href", () => {
    render(
      <ScriptCard script={{ ...BASE, tags: [{ name: "C&C" }] }} />
    );
    const link = screen.getByRole("link", { name: "C&C" });
    expect(link.getAttribute("href")).toBe("/tag/C%26C");
  });
});
