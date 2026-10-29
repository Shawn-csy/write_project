import React, { Suspense } from "react";
import { StudioPage, StudioPageHeader } from "../components/studio/StudioPage";
import { usePublisherDashboardState } from "../hooks/publisher/usePublisherDashboardState";
import { deriveChapterRows } from "../lib/publisher/seriesEditorModel";

const PublisherSeriesTabLazy = React.lazy(async () => {
  const mod = await import("../components/dashboard/publisher/PublisherSeriesTab");
  return { default: mod.PublisherSeriesTab };
});

const tabFallback = <div className="p-6 text-sm text-muted-foreground">載入中…</div>;

export default function SeriesPage(): React.JSX.Element {
  const s = usePublisherDashboardState({ mode: "studio" });

  React.useEffect(() => {
    document.title = "系列｜Screenplay 工作室";
  }, []);

  return (
    <StudioPage width="wide">
      <StudioPageHeader title="系列" description="把多部作品整理成有順序的章節，公開頁會依此順序呈現。" />
      <Suspense fallback={tabFallback}>
        <PublisherSeriesTabLazy
          seriesList={s.seriesList}
          selectedSeriesId={s.selectedSeriesId}
          setSelectedSeriesId={s.setSelectedSeriesId}
          seriesDraft={s.seriesDraft}
          setSeriesDraft={s.setSeriesDraft}
          isDirty={s.isSeriesDraftDirty}
          seriesScripts={deriveChapterRows(s.selectedSeriesScripts || [])}
          selectedSeriesScripts={s.selectedSeriesScripts || []}
          attachableScripts={s.attachableScripts || []}
          onDetachScript={s.handleDetachScriptFromSeries}
          onAttachScript={s.handleAttachScriptToSeries}
          onReorderScript={s.handleReorderScriptInSeries}
          onBatchReorderScripts={s.handleBatchReorderSeriesScripts}
          onCreateSeries={s.handleCreateSeries}
          onUpdateSeries={s.handleUpdateSeries}
          onDeleteSeries={s.handleDeleteSeries}
          isSaving={s.isSavingSeries}
        />
      </Suspense>
    </StudioPage>
  );
}
