import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ScriptGalleryCard } from "../ScriptGalleryCard";
import type { ScriptGalleryItem } from "../ScriptGalleryCard";
import { CARD_SUMMARY_MAX_CHARS } from "../gallery/cardText";
import { GalleryHoverPreviewProvider } from "../gallery/GalleryHoverPreview";

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

  it("series link is in cover badge — not as a separate body row", () => {
    const { container } = render(
      <ScriptGalleryCard script={SCRIPT_WITH_META} href="/read/s2" seriesHref="/series/Epic%20Series" variant="standard" />
    );
    // Badge link exists with accessible label
    const seriesLink = screen.getByRole("link", { name: /系列：Epic Series/ });
    expect(seriesLink).not.toBeNull();
    // It lives inside the cover area (first child div), not the meta body
    const coverArea = container.querySelector("article > div:first-child");
    expect(coverArea?.contains(seriesLink)).toBe(true);
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

  it("series button is in cover badge — calls onSeriesClick", async () => {
    const onSeriesClick = vi.fn();
    const { container } = render(
      <ScriptGalleryCard script={SCRIPT_WITH_META} onSeriesClick={onSeriesClick} variant="standard" />
    );
    const seriesBtn = screen.getByRole("button", { name: /系列：Epic Series/ });
    // Button lives in cover area, not a standalone meta row
    const coverArea = container.querySelector("article > div:first-child");
    expect(coverArea?.contains(seriesBtn)).toBe(true);
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

// ── Card summary and hover outline ───────────────────────────────────────

describe("ScriptGalleryCard — card summary", () => {
  it("renders short summary from _cardSummary", () => {
    render(
      <ScriptGalleryCard
        script={{ ...SCRIPT, _cardSummary: "A short summary" }}
        href="/read/s1"
      />
    );
    expect(screen.getByText("A short summary")).toBeDefined();
  });

  it("truncates long _cardSummary with '...' and max length contract", () => {
    const long = "A".repeat(200);
    render(
      <ScriptGalleryCard
        script={{ ...SCRIPT, _cardSummary: long }}
        href="/read/s1"
      />
    );
    const text = screen.getByText(/^A+\.\.\.$/);
    expect(text.textContent).not.toBe(long);
    expect(text.textContent).toMatch(/\.\.\.$/);
    expect(text.textContent!.length).toBeLessThanOrEqual(CARD_SUMMARY_MAX_CHARS + 3);
  });

  it("renders nothing for summary when _cardSummary is absent", () => {
    const { container } = render(
      <ScriptGalleryCard script={SCRIPT} href="/read/s1" />
    );
    // No summary paragraph rendered — only title/views present
    expect(container.textContent).not.toMatch(/^.{100,}/);
  });

  it("falls back to synopsis when _cardSummary is absent", () => {
    render(
      <ScriptGalleryCard
        script={{ ...SCRIPT, synopsis: "Synopsis fallback" }}
        href="/read/s1"
      />
    );
    expect(screen.getByText(/Synopsis fallback/)).toBeDefined();
  });
});

describe("ScriptGalleryCard — hover preview events (gallery-level layer)", () => {
  it("no card-internal absolute overlay when _hoverOutline present", () => {
    const { container } = render(
      <ScriptGalleryCard script={{ ...SCRIPT, _hoverOutline: "Act 1: setup" }} href="/read/s1" />
    );
    expect(container.querySelector(".absolute.inset-x-2.bottom-2")).toBeNull();
  });

  it("no 查看大綱 button in card DOM", () => {
    render(<ScriptGalleryCard script={{ ...SCRIPT, _hoverOutline: "Act 1" }} href="/read/s1" />);
    expect(screen.queryByRole("button", { name: "查看大綱" })).toBeNull();
  });

  it("mouseEnter emits preview show with title/author/outline via provider", () => {
    const { container } = render(
      <GalleryHoverPreviewProvider>
        <ScriptGalleryCard
          script={{ ...SCRIPT, title: "Test Script", author: { id: "a1", displayName: "Alice" }, _hoverOutline: "The outline body" }}
          href="/read/s1"
        />
      </GalleryHoverPreviewProvider>
    );
    const article = container.querySelector("article")!;
    fireEvent.mouseEnter(article, { clientX: 200, clientY: 100 });
    // Layer renders inside the provider — check document.body
    const layer = document.querySelector("[data-testid='gallery-hover-preview']");
    expect(layer).not.toBeNull();
    const text = layer!.textContent ?? "";
    const titleIdx = text.indexOf("Test Script");
    const authorIdx = text.indexOf("Alice");
    const outlineIdx = text.indexOf("The outline body");
    expect(titleIdx).toBeGreaterThanOrEqual(0);
    expect(authorIdx).toBeGreaterThanOrEqual(0);
    expect(titleIdx).toBeLessThan(outlineIdx);
    expect(authorIdx).toBeLessThan(outlineIdx);
    expect(text).toContain("大綱");
  });

  it("mouseMove updates preview position", () => {
    const { container } = render(
      <GalleryHoverPreviewProvider>
        <ScriptGalleryCard script={{ ...SCRIPT, _hoverOutline: "Outline" }} href="/read/s1" />
      </GalleryHoverPreviewProvider>
    );
    const article = container.querySelector("article")!;
    fireEvent.mouseEnter(article, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(article, { clientX: 300, clientY: 200 });
    const layer = document.querySelector("[data-testid='gallery-hover-preview']") as HTMLElement;
    expect(layer).not.toBeNull();
    // Position should follow cursor — left should be near 300+16=316
    expect(parseInt(layer.style.left)).toBeGreaterThanOrEqual(300);
  });

  it("mouseLeave hides preview", () => {
    const { container } = render(
      <GalleryHoverPreviewProvider>
        <ScriptGalleryCard script={{ ...SCRIPT, _hoverOutline: "Gone soon" }} href="/read/s1" />
      </GalleryHoverPreviewProvider>
    );
    const article = container.querySelector("article")!;
    fireEvent.mouseEnter(article, { clientX: 200, clientY: 100 });
    expect(document.querySelector("[data-testid='gallery-hover-preview']")).not.toBeNull();
    fireEvent.mouseLeave(article);
    expect(document.querySelector("[data-testid='gallery-hover-preview']")).toBeNull();
  });

  it("preview layer has pointer-events: none", () => {
    const { container } = render(
      <GalleryHoverPreviewProvider>
        <ScriptGalleryCard script={{ ...SCRIPT, _hoverOutline: "Outline" }} href="/read/s1" />
      </GalleryHoverPreviewProvider>
    );
    fireEvent.mouseEnter(container.querySelector("article")!, { clientX: 100, clientY: 50 });
    const layer = document.querySelector("[data-testid='gallery-hover-preview']") as HTMLElement;
    expect(layer).not.toBeNull();
    expect(layer.style.pointerEvents).toBe("none");
  });

  it("no preview emitted when outline absent", () => {
    const { container } = render(
      <GalleryHoverPreviewProvider>
        <ScriptGalleryCard script={SCRIPT} href="/read/s1" />
      </GalleryHoverPreviewProvider>
    );
    fireEvent.mouseEnter(container.querySelector("article")!, { clientX: 100, clientY: 50 });
    expect(document.querySelector("[data-testid='gallery-hover-preview']")).toBeNull();
  });

  it("card works without provider (no preview, no crash)", () => {
    const { container } = render(
      <ScriptGalleryCard script={{ ...SCRIPT, _hoverOutline: "Outline" }} href="/read/s1" />
    );
    // mouseEnter without provider — no crash, no preview
    fireEvent.mouseEnter(container.querySelector("article")!, { clientX: 100, clientY: 50 });
    expect(document.querySelector("[data-testid='gallery-hover-preview']")).toBeNull();
  });

  it("no nested interactive elements with outline", () => {
    const { container } = render(
      <ScriptGalleryCard script={{ ...SCRIPT, _hoverOutline: "Outline" }} href="/read/s1" />
    );
    assertNoNestedInteractive(container);
  });
});

describe("ScriptGalleryCard — series cover badge", () => {
  it("series badge is accessible — has aria-label with series name", () => {
    render(
      <ScriptGalleryCard
        script={{ ...SCRIPT_WITH_META }}
        variant="standard"
        href="/read/s2"
        seriesHref="/series/Epic%20Series"
      />
    );
    expect(screen.getByRole("link", { name: "系列：Epic Series" })).not.toBeNull();
  });

  it("series badge lives in cover area, not meta body", () => {
    const { container } = render(
      <ScriptGalleryCard
        script={{ ...SCRIPT_WITH_META }}
        variant="standard"
        href="/read/s2"
        seriesHref="/series/Epic%20Series"
      />
    );
    const coverArea = container.querySelector("article > div:first-child");
    const metaBody = container.querySelectorAll("article > div")[1];
    const badge = screen.getByRole("link", { name: "系列：Epic Series" });
    expect(coverArea?.contains(badge)).toBe(true);
    expect(metaBody?.contains(badge)).toBe(false);
  });

  it("compact variant series badge also in cover area", () => {
    const { container } = render(
      <ScriptGalleryCard
        script={{ ...SCRIPT_WITH_META }}
        variant="compact"
        href="/read/s2"
        seriesHref="/series/Epic%20Series"
      />
    );
    const badge = screen.getByRole("link", { name: "系列：Epic Series" });
    expect(badge).not.toBeNull();
  });
});

// ── showAgeGate ───────────────────────────────────────────────────────────

describe("ScriptGalleryCard showAgeGate", () => {
  it("standard: renders R-18 badge when showAgeGate=true", () => {
    const { container } = render(
      <ScriptGalleryCard script={SCRIPT} href="/read/s1" showAgeGate />
    );
    expect(container.querySelector("article")).not.toBeNull();
    expect(container.textContent).toMatch(/R-18|R18/);
  });

  it("standard: does not render badge when showAgeGate=false", () => {
    const { container } = render(
      <ScriptGalleryCard script={SCRIPT} href="/read/s1" showAgeGate={false} />
    );
    expect(container.textContent).not.toMatch(/R-18|R18/);
  });

  it("compact: renders R-18 badge when showAgeGate=true", () => {
    const { container } = render(
      <ScriptGalleryCard script={SCRIPT} variant="compact" href="/read/s1" showAgeGate />
    );
    expect(container.textContent).toMatch(/R-18|R18/);
  });

  it("compact: does not render badge when showAgeGate=false", () => {
    const { container } = render(
      <ScriptGalleryCard script={SCRIPT} variant="compact" href="/read/s1" showAgeGate={false} />
    );
    expect(container.textContent).not.toMatch(/R-18|R18/);
  });

  it("standard: no nested interactive elements with showAgeGate=true", () => {
    const { container } = render(
      <ScriptGalleryCard
        script={SCRIPT_WITH_META}
        href="/read/s2"
        authorHref="/author/a1"
        seriesHref="/series/Epic"
        showAgeGate
      />
    );
    assertNoNestedInteractive(container);
  });

  it("compact: no nested interactive elements with showAgeGate=true", () => {
    const { container } = render(
      <ScriptGalleryCard
        script={SCRIPT_WITH_META}
        variant="compact"
        href="/read/s2"
        authorHref="/author/a1"
        seriesHref="/series/Epic"
        showAgeGate
      />
    );
    assertNoNestedInteractive(container);
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
