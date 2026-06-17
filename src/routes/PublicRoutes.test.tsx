import React from "react";
import { describe, it, expect } from "vitest";
import { createRoutesFromChildren } from "react-router-dom";
import { renderPublicRoutes } from "./PublicRoutes";

describe("renderPublicRoutes", () => {
  it("returns valid Route children for <Routes>", () => {
    const routeChildren = renderPublicRoutes();
    expect(() => createRoutesFromChildren(routeChildren)).not.toThrow();
  });

  it("does not contain retired public routes", () => {
    const routeChildren = renderPublicRoutes();
    const routes = createRoutesFromChildren(routeChildren);
    const paths = routes.map((r) => r.path);

    // Retired in Batch 1 — canonical owner is apps/public (Next.js).
    expect(paths).not.toContain("/");
    expect(paths).not.toContain("/about");
    expect(paths).not.toContain("/help");
    expect(paths).not.toContain("/license");
    // Retired in Batch 2 — canonical owner is apps/public (Next.js).
    expect(paths).not.toContain("/read/:id");
    expect(paths).not.toContain("/author/:id");
    expect(paths).not.toContain("/org/:id");
    expect(paths).not.toContain("/series/:seriesName");
  });

  it("contains only Vite-owned routes", () => {
    const routeChildren = renderPublicRoutes();
    const routes = createRoutesFromChildren(routeChildren);
    const paths = routes.map((r) => r.path).sort();

    expect(paths).toEqual(["/privacy", "/terms"].sort());
  });
});
