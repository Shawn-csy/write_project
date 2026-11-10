import React, { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { MainLayout } from "./MainLayout";
import { useAppNavigation } from "../../hooks/useAppNavigation";
import { lazyWithRefreshRetry } from "../../lib/lazyWithRefreshRetry";

const ExternalWorksPage = lazyWithRefreshRetry(() => import("../../pages/ExternalWorksPage"), "page-external-works");
const WorkManagePage = lazyWithRefreshRetry(() => import("../../pages/WorkManagePage"), "page-work-manage");
const SeriesPage = lazyWithRefreshRetry(() => import("../../pages/SeriesPage"), "page-series");
const DemoManagementPage = lazyWithRefreshRetry(() => import("../../pages/DemoManagementPage"), "page-demo-management");
const SettingsPage = lazyWithRefreshRetry(() => import("../../pages/SettingsPage"), "page-settings");
const MarkerSettingsPage = lazyWithRefreshRetry(() => import("../../pages/MarkerSettingsPage"), "page-marker-settings");
const SuperAdminPage = lazyWithRefreshRetry(() => import("../../pages/SuperAdminPage"), "page-admin");
const CommunityWorkbenchPage = lazyWithRefreshRetry(() => import("../../pages/CommunityWorkbenchPage"), "page-community-workbench");
const AboutPanel = lazy(() => import("../panels/AboutPanel"));
const SettingsPanel = lazy(() => import("../panels/SettingsPanel"));

const routeFallback = <div className="p-6 text-center text-sm text-muted-foreground">載入中…</div>;

function WorkManageRoute() {
  const { id = "" } = useParams<{ id: string }>();
  return <WorkManagePage key={id} />;
}

function LegacyStudioRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const tab = params.get("tab");
  const scriptId = params.get("scriptId");
  if (scriptId && params.get("open") === "publish") return <Navigate to={`/works/${encodeURIComponent(scriptId)}`} replace />;
  if (tab === "series") return <Navigate to="/series" replace />;
  if (tab === "external") return <Navigate to="/works/external" replace />;
  if (tab === "profile" || tab === "org") return <Navigate to={`/identity?tab=${tab}`} replace />;
  return <Navigate to="/works" replace />;
}

function LegacyDashboardRedirect() {
  const { search } = useLocation();
  const folder = new URLSearchParams(search).get("folder");
  const next = new URLSearchParams({ view: "folders" });
  if (folder) next.set("folder", folder);
  return <Navigate to={`/works?${next.toString()}`} replace />;
}

function LegacyCommunityRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/identity${search}`} replace />;
}

export default function StudioWorkspaceShell() {
  const nav = useAppNavigation();
  useEffect(() => {
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex,nofollow,noarchive";
  }, []);
  const closeOverlays = () => {
    nav.setAboutOpen(false);
    nav.setSettingsOpen(false);
  };

  return (
    <RequireAuth>
      <MainLayout
        isDesktopSidebarOpen={nav.isDesktopSidebarOpen}
        setIsDesktopSidebarOpen={nav.setIsDesktopSidebarOpen}
        isMobileDrawerOpen={nav.isMobileDrawerOpen}
        setIsMobileDrawerOpen={nav.setIsMobileDrawerOpen}
        openAbout={nav.openAbout}
        closeOverlays={closeOverlays}
      >
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {nav.aboutOpen ? (
            <Suspense fallback={routeFallback}>
              <AboutPanel onClose={() => nav.setAboutOpen(false)} />
            </Suspense>
          ) : nav.settingsOpen ? (
            <Suspense fallback={routeFallback}>
              <SettingsPanel onClose={() => nav.setSettingsOpen(false)} activeTab={nav.settingsTab} onTabChange={nav.setSettingsTab} />
            </Suspense>
          ) : (
            <Routes>
              <Route path="works/external" element={<Suspense fallback={routeFallback}><ExternalWorksPage /></Suspense>} />
              <Route path="works/:id" element={<Suspense fallback={routeFallback}><WorkManageRoute /></Suspense>} />
              <Route path="series" element={<Suspense fallback={routeFallback}><SeriesPage /></Suspense>} />
              <Route path="studio/demos" element={<Suspense fallback={routeFallback}><DemoManagementPage /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={routeFallback}><SettingsPage /></Suspense>} />
              <Route path="settings/markers" element={<Suspense fallback={routeFallback}><MarkerSettingsPage /></Suspense>} />
              <Route path="dashboard" element={<LegacyDashboardRedirect />} />
              <Route path="studio" element={<LegacyStudioRedirect />} />
              <Route path="community" element={<LegacyCommunityRedirect />} />
              <Route path="admin" element={<Navigate to="/superadmin" replace />} />
              <Route path="superadmin" element={<Suspense fallback={routeFallback}><SuperAdminPage /></Suspense>} />
              <Route path="identity" element={<Suspense fallback={routeFallback}><CommunityWorkbenchPage /></Suspense>} />
              <Route path="*" element={<Navigate to="/works" replace />} />
            </Routes>
          )}
        </main>
      </MainLayout>
    </RequireAuth>
  );
}
