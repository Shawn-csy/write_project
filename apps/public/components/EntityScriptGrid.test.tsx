import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type React from "react";
import { EntityScriptGrid } from "./EntityScriptGrid";
import type { PublicScript } from "@/lib/types";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

const ownerOnlyScript: PublicScript = {
  id: "s1",
  title: "Owner Script",
  persona: null,
  owner: { id: "owner-123", displayName: "Owner Name" },
  tags: [{ name: "奇幻" }],
};

const personaScript: PublicScript = {
  id: "s2",
  title: "Persona Script",
  persona: { id: "persona-456", displayName: "Author Name" },
  tags: [{ name: "現代" }],
};

describe("EntityScriptGrid — author link contract", () => {
  it("owner-only script does not produce /author/:ownerId link", () => {
    render(<EntityScriptGrid scripts={[ownerOnlyScript]} />);
    const authorLink = screen.queryByRole("link", { name: /owner name/i });
    expect(authorLink).toBeNull();
  });

  it("persona script produces /author/:personaId link", () => {
    render(<EntityScriptGrid scripts={[personaScript]} />);
    const links = document.querySelectorAll(`a[href="/author/persona-456"]`);
    expect(links.length).toBeGreaterThan(0);
  });
});

describe("EntityScriptGrid — tag link contract", () => {
  it("tag chip renders as <a href=/tag/...>, not a button", () => {
    render(<EntityScriptGrid scripts={[ownerOnlyScript]} />);
    const tagLink = document.querySelector(`a[href="/tag/%E5%A5%87%E5%B9%BB"]`);
    expect(tagLink).not.toBeNull();
    expect(tagLink!.tagName).toBe("A");
  });

  it("no tag renders as a button", () => {
    render(<EntityScriptGrid scripts={[ownerOnlyScript]} />);
    const buttons = document.querySelectorAll("button");
    const tagButton = Array.from(buttons).find((b) =>
      b.textContent?.includes("奇幻")
    );
    expect(tagButton).toBeUndefined();
  });
});
