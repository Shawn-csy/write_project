// Phase 2 audit (2026-06-15): Routes below are Vite fallbacks only.
// nginx already routes /, /read/, /author/, /org/, /series/ to Next.js.
// These Vite routes exist as belt-and-suspenders for direct SPA navigation
// and will be removed in Batch 2 once Next parity is confirmed.
// DO NOT add new public canonical routes here — add them in apps/public instead.
import React, { Suspense } from "react";
import { Route } from "react-router-dom";
import { lazyWithRefreshRetry } from "../lib/lazyWithRefreshRetry";
import type { PublicRoutesProps } from "../types/routes";

// Batch 2 — pending removal; canonical owner is apps/public (Next.js)
const PublicReaderPage = lazyWithRefreshRetry(() => import("../pages/PublicReaderPage"), "page-public-reader");
const AuthorProfilePage = lazyWithRefreshRetry(() => import("../pages/AuthorProfilePage"), "page-author-profile");
const OrganizationPage = lazyWithRefreshRetry(() => import("../pages/OrganizationPage"), "page-organization");
const PublicSeriesPage = lazyWithRefreshRetry(() => import("../pages/PublicSeriesPage"), "page-public-series");
// Vite-owned (no Next equivalent yet)
const PrivacyPolicyPage = lazyWithRefreshRetry(() => import("../pages/PrivacyPolicyPage"), "page-privacy-policy");
const TermsOfServicePage = lazyWithRefreshRetry(() => import("../pages/TermsOfServicePage"), "page-terms-of-service");

const routeFallback = <div className="p-8 text-center text-muted-foreground">Loading...</div>;

export function renderPublicRoutes({ scriptManager, navProps }: PublicRoutesProps) {
  return (
    <>
      <Route
        path="/read/:id"
        element={
          <Suspense fallback={routeFallback}>
            <PublicReaderPage scriptManager={scriptManager} navProps={navProps} />
          </Suspense>
        }
      />
      <Route
        path="/series/:seriesName"
        element={
          <Suspense fallback={routeFallback}>
            <PublicSeriesPage />
          </Suspense>
        }
      />
      <Route
        path="/author/:id"
        element={
          <Suspense fallback={routeFallback}>
            <AuthorProfilePage />
          </Suspense>
        }
      />
      <Route
        path="/org/:id"
        element={
          <Suspense fallback={routeFallback}>
            <OrganizationPage />
          </Suspense>
        }
      />
      <Route
        path="/privacy"
        element={
          <Suspense fallback={routeFallback}>
            <PrivacyPolicyPage />
          </Suspense>
        }
      />
      <Route
        path="/terms"
        element={
          <Suspense fallback={routeFallback}>
            <TermsOfServicePage />
          </Suspense>
        }
      />
    </>
  );
}
