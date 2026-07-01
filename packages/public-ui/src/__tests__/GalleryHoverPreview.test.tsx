import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  GalleryHoverPreviewProvider,
  useGalleryHoverPreview,
  clampPreviewPosition,
} from "../gallery/GalleryHoverPreview";

// ── clampPreviewPosition ──────────────────────────────────────────────────────

describe("clampPreviewPosition", () => {
  it("places preview right-and-below cursor by default", () => {
    const { left, top } = clampPreviewPosition(200, 100, 1200, 800);
    expect(left).toBeGreaterThan(200);
    expect(top).toBeGreaterThan(100);
  });

  it("flips left when right side has no room", () => {
    // cursor near right edge of 1024-wide viewport
    const { left } = clampPreviewPosition(900, 100, 1024, 768);
    expect(left).toBeLessThan(900);
  });

  it("clamps upward when bottom has no room", () => {
    // cursor near bottom edge
    const { top } = clampPreviewPosition(200, 700, 1024, 768);
    expect(top).toBeLessThan(700);
  });

  it("clamps left edge to padding", () => {
    // cursor at extreme left, flip puts it negative → clamp to edge pad
    const { left } = clampPreviewPosition(10, 100, 400, 800);
    expect(left).toBeGreaterThanOrEqual(12);
  });
});

// ── GalleryHoverPreviewProvider + Layer ───────────────────────────────────────

function TestCard({ outline, title, author }: { outline: string; title?: string; author?: string }) {
  const ctx = useGalleryHoverPreview();
  return (
    <div
      data-testid="card"
      onMouseEnter={(e) => ctx?.show({ outline, title, author }, e.clientX, e.clientY)}
      onMouseMove={(e) => ctx?.move(e.clientX, e.clientY)}
      onMouseLeave={() => ctx?.hide()}
    />
  );
}

describe("GalleryHoverPreviewProvider + Layer", () => {
  it("renders preview layer on show, removes on hide", () => {
    const { getByTestId } = render(
      <GalleryHoverPreviewProvider>
        <TestCard outline="Outline text" />
      </GalleryHoverPreviewProvider>
    );
    const card = getByTestId("card");
    expect(document.querySelector("[data-testid='gallery-hover-preview']")).toBeNull();
    fireEvent.mouseEnter(card, { clientX: 100, clientY: 50 });
    const layer = document.querySelector("[data-testid='gallery-hover-preview']");
    expect(layer).not.toBeNull();
    expect(layer!.textContent).toContain("Outline text");
    expect(layer!.textContent).toContain("大綱");
    fireEvent.mouseLeave(card);
    expect(document.querySelector("[data-testid='gallery-hover-preview']")).toBeNull();
  });

  it("preview layer has pointer-events: none and position: fixed", () => {
    const { getByTestId } = render(
      <GalleryHoverPreviewProvider>
        <TestCard outline="Outline" />
      </GalleryHoverPreviewProvider>
    );
    fireEvent.mouseEnter(getByTestId("card"), { clientX: 100, clientY: 50 });
    const layer = document.querySelector("[data-testid='gallery-hover-preview']") as HTMLElement;
    expect(layer.style.pointerEvents).toBe("none");
    expect(layer.style.position).toBe("fixed");
  });

  it("renders title and author in order before outline", () => {
    const { getByTestId } = render(
      <GalleryHoverPreviewProvider>
        <TestCard outline="The outline" title="The Title" author="The Author" />
      </GalleryHoverPreviewProvider>
    );
    fireEvent.mouseEnter(getByTestId("card"), { clientX: 100, clientY: 50 });
    const text = document.querySelector("[data-testid='gallery-hover-preview']")!.textContent ?? "";
    expect(text.indexOf("The Title")).toBeLessThan(text.indexOf("The outline"));
    expect(text.indexOf("The Author")).toBeLessThan(text.indexOf("The outline"));
  });

  it("move updates position", () => {
    const { getByTestId } = render(
      <GalleryHoverPreviewProvider>
        <TestCard outline="Outline" />
      </GalleryHoverPreviewProvider>
    );
    const card = getByTestId("card");
    fireEvent.mouseEnter(card, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(card, { clientX: 400, clientY: 200 });
    const layer = document.querySelector("[data-testid='gallery-hover-preview']") as HTMLElement;
    expect(parseInt(layer.style.left)).toBeGreaterThanOrEqual(400);
  });

  it("exactly one preview layer exists (not one per card)", () => {
    const { getAllByTestId } = render(
      <GalleryHoverPreviewProvider>
        <TestCard outline="A" />
        <TestCard outline="B" />
      </GalleryHoverPreviewProvider>
    );
    const cards = getAllByTestId("card");
    fireEvent.mouseEnter(cards[0], { clientX: 100, clientY: 50 });
    const layers = document.querySelectorAll("[data-testid='gallery-hover-preview']");
    expect(layers).toHaveLength(1);
  });
});
