import React from "react";
import { Layers, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { SegmentedControl } from "../../studio/SegmentedControl";
import { PublisherEmptyState, PublisherSplitPanel } from "./PublisherEntityLayout";
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

type SeriesEditorTab = "basic" | "chapters" | "preview";

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

  // Only show the create form when the user asked for it (or has no series yet),
  // instead of treating "nothing selected" as "create a new one".
  const [isCreating, setIsCreating] = React.useState(false);
  React.useEffect(() => {
    if (selectedSeriesId) setIsCreating(false);
  }, [selectedSeriesId]);
  const showCreate = !selected && (isCreating || seriesList.length === 0);
  const [tab, setTab] = React.useState<SeriesEditorTab>("basic");
  React.useEffect(() => {
    setTab("basic");
  }, [selectedSeriesId]);

  const onStartCreate = React.useCallback(() => {
    setSelectedSeriesId("");
    setSeriesDraft({ name: "", summary: "", coverUrl: "", coverCrop: null });
    setIsCreating(true);
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
          title={selected ? (seriesDraft.name || "未命名系列") : showCreate ? "新增系列" : "系列"}
        />
      )}
    >
      {!selected && !showCreate ? (
        <PublisherEmptyState
          icon={Layers}
          title="選擇一個系列"
          description="從左側選擇要編輯的系列，或建立新的系列來整理章節順序。"
          actionLabel="新增系列"
          onAction={onStartCreate}
        />
      ) : !selected ? (
        <SeriesCreateWorkspace
          seriesDraft={seriesDraft}
          setSeriesDraft={setSeriesDraft}
          isSaving={isSaving}
          onCreateSeries={onCreateSeries}
        />
      ) : (
      <div className="flex min-h-full flex-col">
        <SegmentedControl<SeriesEditorTab>
          ariaLabel="系列編輯區段"
          value={tab}
          onChange={setTab}
          className="mb-5 self-start"
          options={[
            { value: "basic", label: "基本資料" },
            { value: "chapters", label: "章節", count: seriesScripts.length },
            { value: "preview", label: "公開預覽" },
          ]}
        />

        <div role="tabpanel" aria-label={tab === "basic" ? "基本資料" : tab === "chapters" ? "章節" : "公開預覽"} className="max-w-3xl flex-1 space-y-8 pb-6">
          {tab === "basic" ? (
            <>
              <SeriesMetadataForm
                seriesDraft={seriesDraft}
                setSeriesDraft={setSeriesDraft}
                isEditing={true}
                isSaving={isSaving}
              />
              <SeriesDangerZone seriesName={seriesDraft.name} isSaving={isSaving} onDeleteSeries={onDeleteSeries} />
            </>
          ) : null}

          {tab === "chapters" ? (
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
            </>
          ) : null}

          {tab === "preview" ? (
            <SeriesPublicPreview
              seriesId={selected.id}
              name={seriesDraft.name}
              summary={seriesDraft.summary}
              coverUrl={seriesDraft.coverUrl}
              scripts={selectedSeriesScripts}
              chapterRows={seriesScripts}
              conflicts={conflicts}
            />
          ) : null}
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
          <span className={isDirty ? "text-sm font-medium text-[hsl(var(--status-ready-fg))]" : "text-sm text-muted-foreground"} role="status">
            {isDirty ? "有尚未儲存的變更" : "所有變更已儲存"}
          </span>
          <Button
            type="button"
            className="ml-auto min-w-[120px] max-sm:w-full"
            disabled={isSaving || !isDirty || !seriesDraft.name.trim()}
            onClick={onUpdateSeries}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            儲存變更
          </Button>
        </div>
      </div>
      )}
    </PublisherSplitPanel>
  );
}
