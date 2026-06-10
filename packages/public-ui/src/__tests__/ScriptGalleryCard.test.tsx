import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ScriptGalleryCard } from "../ScriptGalleryCard";
import type { ScriptGalleryItem } from "../ScriptGalleryCard";

const SCRIPT: ScriptGalleryItem = {
  id: "s1",
  title: "Test Script",
  views: 42,
  likes: 7,
};

const SCRIPT_WITH_META: ScriptGalleryItem = {
  id: "s2",
  title: "Rich Script",
  views: 100,
  likes: 20,
  author: { id: "a1", displayName: "Alice" },
  tags: [{ name: "Drama" }, { name: "Comedy" }],
  seriesName: "Epic Series",
  contentLength: 8000,
};

// ── DOM contract helpers ──────────────────────────────────────────────────

function assertNoNestedInteractive(container: HTMLElement) {
  const links = container.querySelectorAll("a");
  const buttons = container.querySelectorAll("button");
  links.forEach((link) => {
    expect(link.querySelector("a"), "link inside link").toBeNull();
    expect(link.querySelector("button"), "button inside link").toBeNull();
  });
  buttons.forEach((btn) => {
    expect(btn.querySelector("a"), "link inside button").toBeNull();
    expect(btn.querySelector("button"), "button inside button").toBeNull();
  });
}

// ── Standard variant — href mode ─────────────────────────────────────────

describe("ScriptGalleryCard standard — href mode", () => {
  it("root is <article>", () => {
    const { container } = render(<ScriptGalleryCard script={SCRIPT} href="/read/s1" />);
    expect(container.querySelector("article")).not.toBeNull();
  });

  it("no nested interactive elements", () => {
    const { container } = render(
      <ScriptGalleryCard script={SCRIPT_WITH_META} href="/read/s2" seriesHref="/series/Epic" authorHref="/author/a1" onLike={vi.fn()} />
    );
    assertNoNestedInteractive(container);
  });

  it("title is <a> linking to href", () => {
    render(<ScriptGalleryCard script={SCRIPT} href="/read/s1" />);
    const titleLink = screen.getByRole("link", { name: "Test Script" });
    expect(titleLink.getAttribute("href")).toBe("/read/s1");
  });

  it("cover link is aria-hidden (decorative)", () => {
    const { container } = render(<ScriptGalleryCard script={SCRIPT} href="/read/s1" />);
    const coverLink = container.querySelector("a[aria-hidden='true']");
    expect(coverLink).not.toBeNull();
  });

  it("calls onView on cover link click", async () => {
    const onView = vi.fn();
    const { container } = render(<ScriptGalleryCard script={SCRIPT} href="/read/s1" onView={onView} />);
    const coverLink = container.querySelector("a[aria-hidden='true']") as HTMLElement;
    await userEvent.click(coverLink);
    expect(onView).toHaveBeenCalledWith("s1");
  });

  it("author renders as <a> when authorHref provided", () => {
    render(<ScriptGalleryCard script={SCRIPT_WITH_META} href="/read/s2" authorHref="/author/a1" />);
    const authorLink = screen.getByRole("link", { name: "Alice" });
    expect(authorLink.getAttribute("href")).toBe("/author/a1");
  });

  it("series renders as <a> when seriesHref provided", () => {
    render(<ScriptGalleryCard script={SCRIPT_WITH_META} href="/read/s2" seriesHref="/series/Epic%20Series" />);
    const seriesLink = screen.getByRole("link", { name: /Epic Series/ });
    expect(seriesLink.getAttribute("href")).toBe("/series/Epic%20Series");
  });

  it("tags render as <a> when tagHref provided — no button inside link", () => {
    const { container } = render(
      <ScriptGalleryCard
        script={SCRIPT_WITH_META}
        href="/read/s2"
        tagHref={(tag) => `/tag/${tag}`}
      />
    );
    const dramaLink = screen.getByRole("link", { name: "Drama" });
    expect(dramaLink.getAttribute("href")).toBe("/tag/Drama");
    assertNoNestedInteractive(container);
  });
});

// ── Standard variant — callback mode ─────────────────────────────────────

describe("ScriptGalleryCard standard — callback mode", () => {
  it("root is <article>", () => {
    const { container } = render(<ScriptGalleryCard script={SCRIPT} onNavigate={vi.fn()} />);
    expect(container.querySelector("article")).not.toBeNull();
  });

  it("no nested interactive elements", () => {
    const { container } = render(
      <ScriptGalleryCard
        script={SCRIPT_WITH_META}
        onNavigate={vi.fn()}
        onAuthorClick={vi.fn()}
        onSeriesClick={vi.fn()}
        onTagClick={vi.fn()}
        onLike={vi.fn()}
      />
    );
    assertNoNestedInteractive(container);
  });

  it("article click calls onView then onNavigate", async () => {
    const calls: string[] = [];
    const { container } = render(
      <ScriptGalleryCard
        script={SCRIPT}
        onNavigate={() => calls.push("navigate")}
        onView={() => calls.push("view")}
      />
    );
    await userEvent.click(container.querySelector("article") as HTMLElement);
    expect(calls).toEqual(["view", "navigate"]);
  });

  it("author renders as <button> when onAuthorClick provided", () => {
    const onAuthorClick = vi.fn();
    render(
      <ScriptGalleryCard script={SCRIPT_WITH_META} onAuthorClick={onAuthorClick} />
    );
    const authorBtn = screen.getByRole("button", { name: "Alice" });
    expect(authorBtn).not.toBeNull();
  });

  it("author click calls onAuthorClick — not onNavigate", async () => {
    const onNavigate = vi.fn();
    const onAuthorClick = vi.fn();
    render(
      <ScriptGalleryCard script={SCRIPT_WITH_META} onNavigate={onNavigate} onAuthorClick={onAuthorClick} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Alice" }));
    expect(onAuthorClick).toHaveBeenCalledWith("a1");
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("series renders as <button> when onSeriesClick provided", async () => {
    const onSeriesClick = vi.fn();
    render(
      <ScriptGalleryCard script={SCRIPT_WITH_META} onSeriesClick={onSeriesClick} />
    );
    const seriesBtn = screen.getByRole("button", { name: /Epic Series/ });
    await userEvent.click(seriesBtn);
    expect(onSeriesClick).toHaveBeenCalledWith("Epic Series");
  });

  it("tags render as <button> when onTagClick provided", async () => {
    const onTagClick = vi.fn();
    render(<ScriptGalleryCard script={SCRIPT_WITH_META} onTagClick={onTagClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Drama" }));
    expect(onTagClick).toHaveBeenCalledWith("Drama");
  });

  it("like button calls onLike with current id and liked state", async () => {
    const onLike = vi.fn().mockResolvedValue({ liked: true, likes: 8 });
    render(<ScriptGalleryCard script={SCRIPT} onLike={onLike} />);
    await userEvent.click(screen.getByRole("button", { name: /喜歡/ }));
    expect(onLike).toHaveBeenCalledWith("s1", false);
  });

  it("like button is disabled when no onLike", () => {
    render(<ScriptGalleryCard script={SCRIPT} />);
    expect(screen.getByRole("button", { name: /喜歡/ })).toBeDisabled();
  });
});

// ── Compact variant — href mode ───────────────────────────────────────────

describe("ScriptGalleryCard compact — href mode", () => {
  it("root is <article>", () => {
    const { container } = render(<ScriptGalleryCard script={SCRIPT} variant="compact" href="/read/s1" />);
    expect(container.querySelector("article")).not.toBeNull();
  });

  it("no nested interactive elements", () => {
    const { container } = render(
      <ScriptGalleryCard
        script={SCRIPT_WITH_META}
        variant="compact"
        href="/read/s2"
        authorHref="/author/a1"
        seriesHref="/series/Epic"
      />
    );
    assertNoNestedInteractive(container);
  });

  it("title renders as <a> in compact href mode", () => {
    render(<ScriptGalleryCard script={SCRIPT} variant="compact" href="/read/s1" />);
    const titleLink = screen.getByRole("link", { name: "Test Script" });
    expect(titleLink.getAttribute("href")).toBe("/read/s1");
  });
});

// ── Compact variant — callback mode ──────────────────────────────────────

describe("ScriptGalleryCard compact — callback mode", () => {
  it("root is <article>", () => {
    const { container } = render(<ScriptGalleryCard script={SCRIPT} variant="compact" onNavigate={vi.fn()} />);
    expect(container.querySelector("article")).not.toBeNull();
  });

  it("no nested interactive elements", () => {
    const { container } = render(
      <ScriptGalleryCard
        script={SCRIPT_WITH_META}
        variant="compact"
        onNavigate={vi.fn()}
        onAuthorClick={vi.fn()}
        onSeriesClick={vi.fn()}
        onTagClick={vi.fn()}
      />
    );
    assertNoNestedInteractive(container);
  });

  it("article click calls onNavigate in compact callback mode", async () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <ScriptGalleryCard script={SCRIPT} variant="compact" onNavigate={onNavigate} />
    );
    await userEvent.click(container.querySelector("article") as HTMLElement);
    expect(onNavigate).toHaveBeenCalledWith("s1");
  });
});
