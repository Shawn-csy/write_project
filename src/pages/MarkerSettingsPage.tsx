import React, { Suspense } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { lazyWithRefreshRetry } from "../lib/lazyWithRefreshRetry";
import { useStudioShell } from "../components/studio/StudioShellContext";
import { useI18n } from "../contexts/I18nContext";

const MarkerSettings = lazyWithRefreshRetry(async () => {
  const mod = await import("../components/settings/MarkerSettings");
  return { default: mod.MarkerSettings };
}, "settings-markers");

/** Full-width workspace for custom markers; the settings column was too narrow for list + editor + preview. */
export default function MarkerSettingsPage(): React.JSX.Element {
  const { openMobileMenu } = useStudioShell();
  const { t } = useI18n();

  React.useEffect(() => {
    document.title = "自訂標記｜Screenplay 工作室";
  }, []);

  return (
    <div className="studio-density h-full min-h-0">
      <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">{t("common.loading", "載入中...")}</div>}>
        <MarkerSettings
          headerLeading={(
            <button
              type="button"
              onClick={openMobileMenu}
              className="-ml-2 mr-1 inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:hidden"
              aria-label="開啟選單"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          breadcrumb={(
            <>
              <Link to="/settings" className="hover:text-foreground">{t("settings.title")}</Link>
              <span aria-hidden="true">/</span>
              <span>{t("settings.markers")}</span>
            </>
          )}
        />
      </Suspense>
    </div>
  );
}
