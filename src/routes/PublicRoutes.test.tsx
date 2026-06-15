import React from "react";
import { describe, it, expect } from "vitest";
import { createRoutesFromChildren } from "react-router-dom";
import { renderPublicRoutes } from "./PublicRoutes";

describe("renderPublicRoutes", () => {
  it("returns valid Route children for <Routes>", () => {
    const routeChildren = renderPublicRoutes({
      scriptManager: {},
      navProps: {},
    });

    expect(() => createRoutesFromChildren(routeChildren)).not.toThrow();
  });

  it("does not contain retired public gallery routes", () => {
    const routeChildren = renderPublicRoutes({ scriptManager: {}, navProps: {} });
    const routes = createRoutesFromChildren(routeChildren);
    const paths = routes.map((r) => r.path);

    // These routes were retired in Phase 2 Batch 1 — canonical owner is apps/public (Next.js).
    expect(paths).not.toContain("/");
    expect(paths).not.toContain("/about");
    expect(paths).not.toContain("/help");
    expect(paths).not.toContain("/help/import-format");
    expect(paths).not.toContain("/license");
  });

  it("contains only expected routes", () => {
    const routeChildren = renderPublicRoutes({ scriptManager: {}, navProps: {} });
    const routes = createRoutesFromChildren(routeChildren);
    const paths = routes.map((r) => r.path).sort();

    // Batch 2 (pending removal) + Vite-owned pages
    expect(paths).toEqual([
      "/author/:id",
      "/org/:id",
      "/privacy",
      "/read/:id",
      "/series/:seriesName",
      "/terms",
    ].sort());
  });
});
