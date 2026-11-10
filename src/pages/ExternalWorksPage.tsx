import React, { Suspense } from "react";
import { StudioPage, StudioPageHeader } from "../components/studio/StudioPage";
import { usePublisherDashboardState } from "../hooks/publisher/usePublisherDashboardState";

const StudioExternalScriptsTabLazy = React.lazy(async () => {
  const mod = await import("../components/dashboard/publisher/StudioExternalScriptsTab");
  return { default: mod.StudioExternalScriptsTab };
});

export default function ExternalWorksPage(): React.JSX.Element {
  const s = usePublisherDashboardState({ mode: "studio" });

  React.useEffect(() => {
    document.title = "加入外部作品｜Screenplay 工作室";
  }, []);

  return (
    <StudioPage width="wide">
      <StudioPageHeader
        back={{ to: "/works", label: "作品" }}
        title="加入外部作品"
      />
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">載入中…</div>}>
        <StudioExternalScriptsTabLazy personas={s.personas} />
      </Suspense>
    </StudioPage>
  );
}
