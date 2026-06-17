// Public routes: canonical owner is apps/public (Next.js).
// nginx routes /, /read/, /author/, /org/, /series/, /tag/ to Next.
// DO NOT add canonical public routes here — add them in apps/public instead.
import React, { Suspense } from "react";
import { Route } from "react-router-dom";
import { lazyWithRefreshRetry } from "../lib/lazyWithRefreshRetry";

const PrivacyPolicyPage = lazyWithRefreshRetry(() => import("../pages/PrivacyPolicyPage"), "page-privacy-policy");
const TermsOfServicePage = lazyWithRefreshRetry(() => import("../pages/TermsOfServicePage"), "page-terms-of-service");

const routeFallback = <div className="p-8 text-center text-muted-foreground">Loading...</div>;

export function renderPublicRoutes() {
  return (
    <>
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
