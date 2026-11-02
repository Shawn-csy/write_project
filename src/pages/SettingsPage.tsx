import React, { Suspense } from "react";
import { Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { lazyWithRefreshRetry } from "../lib/lazyWithRefreshRetry";
import { useStudioShell } from "../components/studio/StudioShellContext";

const SettingsPanel = lazyWithRefreshRetry(() => import("../components/panels/SettingsPanel"), "settings-panel");

const SETTINGS_TABS = ["display", "media", "markers", "profile"];

const tabPath = (tab: string): string => {
  return tab === "display" ? "/settings" : `/settings?tab=${tab}`;
};

export default function SettingsPage(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { openMobileMenu } = useStudioShell();
  const requested = new URLSearchParams(location.search).get("tab") || "display";
  const activeTab = SETTINGS_TABS.includes(requested) ? requested : "display";

  React.useEffect(() => {
    document.title = "設定｜Screenplay 工作室";
  }, []);

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">載入中…</div>}>
      <SettingsPanel
        activeTab={activeTab}
        onTabChange={(tab) => navigate(tabPath(tab), { replace: tab !== "markers" })}
        headerLeading={(
          <button
            type="button"
            onClick={openMobileMenu}
            className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="開啟選單"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      />
    </Suspense>
  );
}
