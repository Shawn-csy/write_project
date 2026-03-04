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
});
