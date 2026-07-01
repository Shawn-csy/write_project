import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import {
  PublicInfoDocument,
  PublicInfoLead,
  PublicInfoBelowFold,
} from "./PublicInfoDocument";

const dir = join(__dirname, "../../app");

describe("PublicInfoDocument", () => {
  it("renders children", () => {
    render(
      <PublicInfoDocument>
        <p data-testid="child">content</p>
      </PublicInfoDocument>
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });
});

describe("PublicInfoLead", () => {
  it("renders children in a section", () => {
    const { container } = render(
      <PublicInfoLead>
        <p>lead text</p>
      </PublicInfoLead>
    );
    expect(container.querySelector("section")).toBeTruthy();
    expect(screen.getByText("lead text")).toBeTruthy();
  });

  it("has no client directive", () => {
    const src = readFileSync(join(__dirname, "PublicInfoDocument.tsx"), "utf-8");
    expect(src).not.toMatch(/^"use client"/m);
  });
});

describe("PublicInfoBelowFold", () => {
  it("renders children", () => {
    render(
      <PublicInfoBelowFold>
        <div data-testid="below">cards here</div>
      </PublicInfoBelowFold>
    );
    expect(screen.getByTestId("below")).toBeTruthy();
  });
});

describe("/about page — first-viewport structure", () => {
  it("lead section exists and contains plain text, not card blocks", () => {
    const src = readFileSync(join(dir, "about/page.tsx"), "utf-8");
    expect(src).toContain("PublicInfoLead");
    expect(src).toContain("PublicInfoBelowFold");
  });

  it("card blocks are inside PublicInfoBelowFold, not PublicInfoLead", () => {
    const src = readFileSync(join(dir, "about/page.tsx"), "utf-8");
    const leadMatch = src.match(/<PublicInfoLead>([\s\S]*?)<\/PublicInfoLead>/);
    expect(leadMatch).toBeTruthy();
    // card class must not appear inside the lead section
    expect(leadMatch![1]).not.toContain("rounded-xl border bg-muted");
    expect(leadMatch![1]).not.toContain("PublicInfoSection");
  });
});

describe("/help page — first-viewport structure", () => {
  it("lead section exists and contains three-step summary", () => {
    const src = readFileSync(join(dir, "help/page.tsx"), "utf-8");
    expect(src).toContain("PublicInfoLead");
    expect(src).toContain("PublicInfoBelowFold");
  });

  it("card blocks are inside PublicInfoBelowFold, not PublicInfoLead", () => {
    const src = readFileSync(join(dir, "help/page.tsx"), "utf-8");
    const leadMatch = src.match(/<PublicInfoLead>([\s\S]*?)<\/PublicInfoLead>/);
    expect(leadMatch).toBeTruthy();
    expect(leadMatch![1]).not.toContain("PublicInfoSection");
  });
});

describe("/license page — uses document primitive", () => {
  it("uses PublicInfoDocument and PublicInfoBelowFold", () => {
    const src = readFileSync(join(dir, "license/page.tsx"), "utf-8");
    expect(src).toContain("PublicInfoDocument");
    expect(src).toContain("PublicInfoLead");
    expect(src).toContain("PublicInfoBelowFold");
  });
});
