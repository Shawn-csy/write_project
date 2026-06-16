import React from "react";
import { PublisherSplitPanel, PUBLISHER_CONTENT_STACK_CLASS } from "./PublisherEntityLayout";
import { PublisherTabHeader } from "./PublisherTabHeader";
import { SeriesListPane } from "./SeriesListPane";
import { SeriesMetadataForm } from "./SeriesMetadataForm";
import { SeriesChapterManager } from "./SeriesChapterManager";
import type { SeriesChapterRow } from "../../../lib/publisher/seriesEditorModel";
import type { BaseScriptApi } from "../../../types/api";

interface SeriesItem {
  id: string;
  name?: string;
  summary?: string;
  coverUrl?: string;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  scriptCount?: number;
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
  seriesScripts?: SeriesChapterRow[];
  attachableScripts?: BaseScriptApi[];
  onDetachScript?: (scriptId: string, seriesId: string) => void;
  onAttachScript?: (scriptId: string, seriesId: string, order: number | null) => void;
  onReorderScript?: (scriptId: string, order: number | null) => void;
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
  seriesScripts = [],
  attachableScripts = [],
  onDetachScript,
  onAttachScript,
  onReorderScript,
  onCreateSeries,
  onUpdateSeries,
  onDeleteSeries,
  isSaving = false,
}: PublisherSeriesTabProps): React.JSX.Element {
  const selected = seriesList.find((s) => s.id === selectedSeriesId) || null;

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
        />
      )}
      header={(
        <PublisherTabHeader
          title={selected ? "編輯系列" : "建立系列"}
          description="建立系列，設定封面與摘要，並整理每部作品的系列關聯。"
        />
      )}
    >
      <div className={PUBLISHER_CONTENT_STACK_CLASS}>
        <SeriesMetadataForm
          seriesDraft={seriesDraft}
          setSeriesDraft={setSeriesDraft}
          isEditing={Boolean(selected)}
          isSaving={isSaving}
          onCreateSeries={onCreateSeries}
          onUpdateSeries={onUpdateSeries}
          onDeleteSeries={onDeleteSeries}
        />

        {selected && (
          <SeriesChapterManager
            seriesId={selected.id}
            seriesScripts={seriesScripts}
            attachableScripts={attachableScripts}
            onDetachScript={onDetachScript}
            onAttachScript={onAttachScript}
            onReorderScript={onReorderScript}
          />
        )}
      </div>
    </PublisherSplitPanel>
  );
}
