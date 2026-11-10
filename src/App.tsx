import React, { Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
import { lazyWithRefreshRetry } from "./lib/lazyWithRefreshRetry";

const EditorShell = lazyWithRefreshRetry(() => import("./components/editor/EditorShell"), "editor-shell");
const StudioWorkspaceShell = lazyWithRefreshRetry(
  () => import("./components/layout/StudioWorkspaceShell"),
  "studio-workspace-shell",
);

const studioPaths = [
  "/identity", "/series", "/studio/demos", "/settings", "/superadmin",
  "/dashboard", "/studio", "/community", "/admin", "/works/external",
];

function isStudioWorkspacePath(pathname: string) {
  return studioPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
    || /^\/works\/[^/]+$/.test(pathname);
}

function App() {
  const { pathname } = useLocation();
  const Workspace = isStudioWorkspacePath(pathname) ? StudioWorkspaceShell : EditorShell;

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">載入中…</div>}>
      <Workspace />
    </Suspense>
  );
}

export default App;
