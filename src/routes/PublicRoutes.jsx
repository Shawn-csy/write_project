import React, { Suspense } from "react";
import { Route } from "react-router-dom";
import { lazyWithRefreshRetry } from "../lib/lazyWithRefreshRetry";

const PublicReaderPage = lazyWithRefreshRetry(() => import("../pages/PublicReaderPage"), "page-public-reader");
const PublicGalleryPage = lazyWithRefreshRetry(() => import("../pages/PublicGalleryPage"), "page-public-gallery");
const AuthorProfilePage = lazyWithRefreshRetry(() => import("../pages/AuthorProfilePage"), "page-author-profile");
const OrganizationPage = lazyWithRefreshRetry(() => import("../pages/OrganizationPage"), "page-organization");
const PublicSeriesPage = lazyWithRefreshRetry(() => import("../pages/PublicSeriesPage"), "page-public-series");
const PublicAboutPage = lazyWithRefreshRetry(() => import("../pages/PublicAboutPage"), "page-public-about");

const routeFallback = <div className="p-8 text-center text-muted-foreground">Loading...</div>;

export function renderPublicRoutes({ scriptManager, navProps }) {
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
        path="/"
        element={
          <Suspense fallback={routeFallback}>
            <PublicGalleryPage />
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
        path="/about"
        element={
          <Suspense fallback={routeFallback}>
            <PublicAboutPage />
          </Suspense>
        }
      />
    </>
  );
}
