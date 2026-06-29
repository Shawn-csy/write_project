import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicInfoSection } from "./PublicInfoSection";

describe("PublicInfoSection", () => {
  it("renders as <section> regardless of card prop", () => {
    const { container: c1 } = render(<PublicInfoSection title="T"><p>body</p></PublicInfoSection>);
    expect(c1.querySelector("section")).toBeTruthy();

    const { container: c2 } = render(<PublicInfoSection title="T" card><p>body</p></PublicInfoSection>);
    expect(c2.querySelector("section")).toBeTruthy();
    expect(c2.querySelector("div")).toBeNull();
  });

  it("renders h2 title", () => {
    render(<PublicInfoSection title="授權原則"><p>c</p></PublicInfoSection>);
    expect(screen.getByRole("heading", { level: 2, name: "授權原則" })).toBeTruthy();
  });

  it("renders description when provided", () => {
    render(<PublicInfoSection title="T" description="說明文字"><p>c</p></PublicInfoSection>);
    expect(screen.getByText("說明文字")).toBeTruthy();
  });

  it("omits description element when not provided", () => {
    render(<PublicInfoSection title="T"><p>c</p></PublicInfoSection>);
    expect(screen.queryByText("說明文字")).toBeNull();
  });

  it("renders icon slot", () => {
    render(
      <PublicInfoSection title="T" icon={<span data-testid="icon">♥</span>}>
        <p>c</p>
      </PublicInfoSection>
    );
    expect(screen.getByTestId("icon")).toBeTruthy();
  });

  it("card mode adds card classes", () => {
    const { container } = render(<PublicInfoSection title="T" card><p>c</p></PublicInfoSection>);
    const section = container.querySelector("section")!;
    expect(section.className).toMatch(/rounded-xl/);
    expect(section.className).toMatch(/border/);
  });

  it("non-card mode uses space-y-3", () => {
    const { container } = render(<PublicInfoSection title="T"><p>c</p></PublicInfoSection>);
    const section = container.querySelector("section")!;
    expect(section.className).toMatch(/space-y-3/);
    expect(section.className).not.toMatch(/rounded-xl/);
  });

  it("renders children", () => {
    render(
      <PublicInfoSection title="T">
        <span data-testid="child">content</span>
      </PublicInfoSection>
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });
});
