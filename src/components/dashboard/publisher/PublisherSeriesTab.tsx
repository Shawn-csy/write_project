import React from "react";
import { PublisherSplitPanel, PUBLISHER_CONTENT_STACK_CLASS } from "./PublisherEntityLayout";
import { PublisherTabHeader } from "./PublisherTabHeader";
import { SeriesListPane } from "./SeriesListPane";
import { SeriesMetadataForm } from "./SeriesMetadataForm";
import { SeriesChapterManager } from "./SeriesChapterManager";
import { SeriesDangerZone } from "./SeriesDangerZone";
import { SeriesOverviewPanel } from "./SeriesOverviewPanel";
import { SeriesPublicPreview } from "./SeriesPublicPreview";
import { SeriesCreateWorkspace } from "./SeriesCreateWorkspace";
import { detectOrderConflicts } from "../../../lib/publisher/seriesEditorModel";
import type { SeriesChapterRow } from "../../../lib/publisher/seriesEditorModel";
import type { BaseScriptApi } from "../../../types/api";

interface SeriesItem {
  id: string;
  name?: string;
  summary?: string;
  coverUrl?: string;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  scriptCount?: number;
  updatedAt?: number;
}

interface SeriesDraft {
  name: string;
  summary: string;
  coverUrl: string;
  coverCrop: { cx?: number; cy?: number; zoom?: number } | null;
}

interface PublisherSeriesTabProps {
  seriesList?: SeriesItem[];
  selectedSeriesId?: string;
  setSelectedSeriesId: (id: string) => void;
  seriesDraft: SeriesDraft;
  setSeriesDraft: React.Dispatch<React.SetStateAction<SeriesDraft>>;
  isDirty?: boolean;
  seriesScripts?: SeriesChapterRow[];
  /** Raw BaseScriptApi[] for the selected series — used by SeriesPublicPreview. */
  selectedSeriesScripts?: BaseScriptApi[];
  attachableScripts?: BaseScriptApi[];
  onDetachScript?: (scriptId: string, seriesId: string) => void;
  onAttachScript?: (scriptId: string, seriesId: string, order: number | null) => void;
  onReorderScript?: (scriptId: string, order: number | null) => void;
  onBatchReorderScripts?: (seriesId: string, currentRows: SeriesChapterRow[], targetOrders: Map<string, number | null>) => void;
  onCreateSeries: () => void;
  onUpdateSeries: () => void;
  onDeleteSeries: () => void;
  isSaving?: boolean;
}

export function PublisherSeriesTab({
  seriesList = [],
  selectedSeriesId = "",
  setSelectedSeriesId,
  seriesDraft,
  setSeriesDraft,
  isDirty = false,
  seriesScripts = [],
  selectedSeriesScripts = [],
  attachableScripts = [],
  onDetachScript,
  onAttachScript,
  onReorderScript,
  onBatchReorderScripts,
  onCreateSeries,
  onUpdateSeries,
  onDeleteSeries,
  isSaving = false,
}: PublisherSeriesTabProps): React.JSX.Element {
  const selected = seriesList.find((s) => s.id === selectedSeriesId) || null;
  const conflicts = React.useMemo(() => detectOrderConflicts(seriesScripts), [seriesScripts]);

  const onStartCreate = React.useCallback(() => {
    setSelectedSeriesId("");
    setSeriesDraft({ name: "", summary: "", coverUrl: "", coverCrop: null });
  }, [setSelectedSeriesId, setSeriesDraft]);

  return (
    <PublisherSplitPanel
      sidebar={(
        <SeriesListPane
          seriesList={seriesList}
          selectedSeriesId={selectedSeriesId}
          setSelectedSeriesId={setSelectedSeriesId}
          setSeriesDraft={setSeriesDraft}
          onStartCreate={onStartCreate}
          isDirty={isDirty}
        />
      )}
      header={(
        <PublisherTabHeader
          title={selected ? "編輯系列" : "建立系列"}
          description={
            selected
              ? "設定封面與摘要，並整理每部作品的系列關聯。"
              : "先建立系列基本資料，建立後可加入作品、排序章節並預覽公開頁。"
          }
        />
      )}
    >
      {!selected ? (
        <SeriesCreateWorkspace
          seriesDraft={seriesDraft}
          setSeriesDraft={setSeriesDraft}
          isSaving={isSaving}
          onCreateSeries={onCreateSeries}
        />
      ) : (
      <div className={PUBLISHER_CONTENT_STACK_CLASS}>
        <SeriesMetadataForm
          seriesDraft={seriesDraft}
          setSeriesDraft={setSeriesDraft}
          isEditing={true}
          isSaving={isSaving}
          onUpdateSeries={onUpdateSeries}
        />

        {selected && (
          <>
            <SeriesOverviewPanel
              name={seriesDraft.name}
              summary={seriesDraft.summary}
              coverUrl={seriesDraft.coverUrl}
              coverCrop={seriesDraft.coverCrop}
              chapterRows={seriesScripts}
            />

            <SeriesChapterManager
              seriesId={selected.id}
              seriesScripts={seriesScripts}
              attachableScripts={attachableScripts}
              onDetachScript={onDetachScript}
              onAttachScript={onAttachScript}
              onReorderScript={onReorderScript}
              onBatchReorderScripts={onBatchReorderScripts}
            />

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                公開預覽
              </p>
              <SeriesPublicPreview
                seriesId={selected.id}
                name={seriesDraft.name}
                summary={seriesDraft.summary}
                coverUrl={seriesDraft.coverUrl}
                scripts={selectedSeriesScripts}
                chapterRows={seriesScripts}
                conflicts={conflicts}
              />
            </div>

            <SeriesDangerZone seriesName={seriesDraft.name} isSaving={isSaving} onDeleteSeries={onDeleteSeries} />
          </>
        )}
      </div>
      )}
    </PublisherSplitPanel>
  );
}
