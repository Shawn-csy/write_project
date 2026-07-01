import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PublicReaderShell } from "../reader/PublicReaderShell";

describe("PublicReaderShell — layout slots", () => {
  it("renders children", () => {
    render(
      <PublicReaderShell>
        <p>Script content</p>
      </PublicReaderShell>
    );
    expect(screen.getByText("Script content")).toBeInTheDocument();
  });

  it("renders toolbar slot when provided", () => {
    render(
      <PublicReaderShell toolbar={<div>Toolbar</div>}>
        <p>Content</p>
      </PublicReaderShell>
    );
    expect(screen.getByText("Toolbar")).toBeInTheDocument();
  });

  it("renders header slot when provided", () => {
    render(
      <PublicReaderShell header={<div>Header</div>}>
        <p>Content</p>
      </PublicReaderShell>
    );
    expect(screen.getByText("Header")).toBeInTheDocument();
  });

  it("renders footer slot when provided", () => {
    render(
      <PublicReaderShell footer={<div>Footer</div>}>
        <p>Content</p>
      </PublicReaderShell>
    );
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("omits toolbar when not provided", () => {
    const { container } = render(
      <PublicReaderShell>
        <p>Content</p>
      </PublicReaderShell>
    );
    // No z-30 shrink-0 wrapper unless toolbar provided
    expect(container.querySelector(".z-30")).toBeNull();
  });

  it("renders blurred cover img when coverUrl provided", () => {
    const { container } = render(
      <PublicReaderShell coverUrl="https://example.com/cover.jpg">
        <p>Content</p>
      </PublicReaderShell>
    );
    const bgImg = container.querySelector("img[alt='']") as HTMLImageElement;
    expect(bgImg).not.toBeNull();
    expect(bgImg.src).toContain("cover.jpg");
  });

  it("renders gradient fallback when coverUrl absent", () => {
    const { container } = render(
      <PublicReaderShell>
        <p>Content</p>
      </PublicReaderShell>
    );
    expect(container.querySelector("img[alt='']")).toBeNull();
  });
});

describe("PublicReaderShell — contentWidth presets", () => {
  const getContentWrapper = (container: HTMLElement) => {
    const content = container.querySelector("p")!;
    // Walk up to the mx-auto wrapper that carries the max-w class
    return content.closest(".mx-auto") as HTMLElement;
  };

  it('default uses max-w-4xl', () => {
    const { container } = render(
      <PublicReaderShell><p>Content</p></PublicReaderShell>
    );
    const wrapper = getContentWrapper(container);
    expect(wrapper.className).toContain("max-w-4xl");
  });

  it('presentation uses responsive desktop-wide preset', () => {
    const { container } = render(
      <PublicReaderShell contentWidth="presentation"><p>Content</p></PublicReaderShell>
    );
    const wrapper = getContentWrapper(container);
    expect(wrapper.className).toContain("max-w-4xl");
    expect(wrapper.className).toContain("lg:max-w-6xl");
    expect(wrapper.className).toContain("2xl:max-w-7xl");
  });

  it('wide uses max-w-7xl', () => {
    const { container } = render(
      <PublicReaderShell contentWidth="wide"><p>Content</p></PublicReaderShell>
    );
    const wrapper = getContentWrapper(container);
    expect(wrapper.className).toContain("max-w-7xl");
  });
});
