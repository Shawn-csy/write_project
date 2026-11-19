import React, { Suspense } from "react";
import { Skeleton, FormSkeleton } from "../components/studio/StudioSkeleton";
import { StudioPage, StudioPageHeader } from "../components/studio/StudioPage";
import { usePublisherDashboardState } from "../hooks/publisher/usePublisherDashboardState";
import { deriveChapterRows } from "../lib/publisher/seriesEditorModel";

const PublisherSeriesTabLazy = React.lazy(async () => {
  const mod = await import("../components/dashboard/publisher/PublisherSeriesTab");
  return { default: mod.PublisherSeriesTab };
});

const tabFallback = (
  <div className="flex flex-col gap-6 md:flex-row md:gap-8" role="status" aria-busy="true" aria-label="載入系列中">
    <div className="w-full space-y-2 md:w-72">
      {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
    </div>
    <div className="min-w-0 flex-1 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-9 w-72 max-w-full" />
      <FormSkeleton blocks={2} />
    </div>
  </div>
);

export default function SeriesPage(): React.JSX.Element {
  const s = usePublisherDashboardState({ mode: "studio" });

  React.useEffect(() => {
    document.title = "系列｜Screenplay 工作室";
  }, []);

  return (
    <StudioPage width="wide">
      <StudioPageHeader title="系列" />
      {s.isMetaLoading ? tabFallback : (
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
      )}
    </StudioPage>
  );
}
