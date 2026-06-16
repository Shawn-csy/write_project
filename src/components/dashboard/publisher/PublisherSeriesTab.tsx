import React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { MediaPicker } from "../../ui/MediaPicker";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { getMediaCropStyle } from "../../../lib/mediaCropRef";
import { PublisherFormRow } from "./PublisherFormRow";
import { PublisherTabHeader } from "./PublisherTabHeader";
import {
  PublisherSplitPanel,
  PublisherEntityListPane,
  PublisherEntityListItem,
  PublisherEmptyState,
  PUBLISHER_CONTENT_STACK_CLASS,
} from "./PublisherEntityLayout";
import { detectOrderConflicts, normalizeEditableSeriesOrder } from "../../../lib/publisher/seriesEditorModel";
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
  const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState<boolean>(false);
  const [coverPreviewFailed, setCoverPreviewFailed] = React.useState<boolean>(false);
  const [attachScriptId, setAttachScriptId] = React.useState<string>("");
  const [attachOrder, setAttachOrder] = React.useState<string>("");
  const [attachOrderError, setAttachOrderError] = React.useState<string>("");
  // scriptId → pending order string while user edits inline
  const [pendingOrders, setPendingOrders] = React.useState<Record<string, string>>({});
  // scriptId → validation error while pending edit is invalid
  const [orderErrors, setOrderErrors] = React.useState<Record<string, string>>({});
  const cropCover = getMediaCropStyle(String(seriesDraft.coverUrl || ""), seriesDraft.coverCrop);

  const conflicts = React.useMemo(() => detectOrderConflicts(seriesScripts), [seriesScripts]);
  const conflictOrders = React.useMemo(
    () => new Set(conflicts.map((c) => c.order)),
    [conflicts]
  );
  const missingOrderCount = seriesScripts.filter((r) => r.isMissingOrder).length;

  React.useEffect(() => {
    setCoverPreviewFailed(false);
  }, [seriesDraft.coverUrl]);

  const onStartCreate = React.useCallback(() => {
    setSelectedSeriesId("");
    setSeriesDraft({ name: "", summary: "", coverUrl: "", coverCrop: null });
  }, [setSelectedSeriesId, setSeriesDraft]);

  return (
    <PublisherSplitPanel
      sidebar={(
        <PublisherEntityListPane
          id="publisher-series-list"
          title="系列清單"
          onCreate={onStartCreate}
          createAriaLabel="新增系列"
        >
          {seriesList.length === 0 ? (
            <PublisherEmptyState
              title="尚未建立系列。"
              description="建立系列後，可集中管理封面、摘要與作品順序。"
              className="mx-1"
            />
          ) : null}
          {seriesList.map((series) => (
            <PublisherEntityListItem
              key={series.id}
              selected={selectedSeriesId === series.id}
              onClick={() => {
                setSelectedSeriesId(series.id);
                setSeriesDraft({
                  name: series.name || "",
                  summary: series.summary || "",
                  coverUrl: series.coverUrl || "",
                  coverCrop: series.coverCrop || null,
                });
              }}
              title={series.name}
              subtitle={`${series.scriptCount || 0} 部作品`}
            />
          ))}
        </PublisherEntityListPane>
      )}
      header={(
        <PublisherTabHeader
          title={selected ? "編輯系列" : "建立系列"}
          description="建立系列，設定封面與摘要，並整理每部作品的系列關聯。"
        />
      )}
    >
      <div className={PUBLISHER_CONTENT_STACK_CLASS}>
        <PublisherFormRow label="系列名稱" required hint="公開頁上顯示的系列主名稱。">
          <Input
            value={seriesDraft.name}
            onChange={(e) => setSeriesDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例如：星海遠征"
          />
        </PublisherFormRow>

        <PublisherFormRow label="系列摘要" hint="簡短說明系列核心設定。">
          <Textarea
            value={seriesDraft.summary}
            onChange={(e) => setSeriesDraft((prev) => ({ ...prev, summary: e.target.value }))}
            placeholder="簡短介紹這個系列。"
            rows={4}
          />
        </PublisherFormRow>

        <PublisherFormRow label="系列封面圖" hint="可貼網址或從媒體庫挑選。">
          <div className="space-y-2">
            <Input
              value={seriesDraft.coverUrl}
              onChange={(e) => setSeriesDraft((prev) => ({ ...prev, coverUrl: e.target.value, coverCrop: null }))}
              placeholder="https://..."
            />
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsMediaPickerOpen(true)}
              >
                從媒體庫選擇
              </Button>
            </div>
          </div>
        </PublisherFormRow>

        <PublisherFormRow label="封面預覽">
          <div className="h-36 w-24 overflow-hidden rounded-md border bg-muted/20">
            {seriesDraft.coverUrl && !coverPreviewFailed ? (
              <img
                src={cropCover.src}
                style={cropCover.style}
                alt="series cover preview"
                className="h-full w-full object-cover"
                onError={() => setCoverPreviewFailed(true)}
              />
            ) : (
              <CoverPlaceholder title={seriesDraft.name || "Series"} compact />
            )}
          </div>
        </PublisherFormRow>

        <PublisherFormRow label="操作">
          <div className="flex items-center gap-2 pt-1">
            {!selected ? (
              <Button disabled={isSaving || !seriesDraft.name.trim()} onClick={onCreateSeries}>
                建立系列
              </Button>
            ) : (
              <>
                <Button disabled={isSaving || !seriesDraft.name.trim()} onClick={onUpdateSeries}>
                  儲存變更
                </Button>
                <Button variant="destructive" disabled={isSaving} onClick={onDeleteSeries}>
                  刪除系列
                </Button>
              </>
            )}
          </div>
        </PublisherFormRow>

        {selected && (
          <div className="border-t pt-3 space-y-4">
            {/* Warnings */}
            {(conflicts.length > 0 || missingOrderCount > 0) && (
              <div className="space-y-1.5">
                {conflicts.length > 0 && (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    ⚠ {conflicts.length} 個重複章節順序：{conflicts.map((c) => `第 ${c.order} 作`).join("、")}。請調整後再發布。
                  </p>
                )}
                {missingOrderCount > 0 && (
                  <p className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    {missingOrderCount} 部作品尚未設定章節順序。
                  </p>
                )}
              </div>
            )}

            {/* Chapter list */}
            <PublisherFormRow label="章節列表" hint="可 inline 調整順序，Enter 或離開欄位後儲存。">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">已加入作品</h4>
                  <Badge variant="outline">{seriesScripts.length} 部</Badge>
                </div>
                {seriesScripts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">目前此系列沒有作品。</p>
                ) : (
                  <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
                    {seriesScripts.map((script) => {
                      const pendingVal = pendingOrders[script.id];
                      const displayVal = pendingVal !== undefined
                        ? pendingVal
                        : script.seriesOrder !== null ? String(script.seriesOrder) : "";
                      const hasConflict = script.seriesOrder !== null && conflictOrders.has(script.seriesOrder);
                      const orderError = orderErrors[script.id];

                      return (
                        <div
                          key={script.id}
                          className={`flex items-center gap-3 rounded-md border px-3 py-2 ${hasConflict ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20" : "bg-muted/20"}`}
                        >
                          {/* Order input */}
                          <div className="flex w-16 shrink-0 flex-col items-center gap-0.5">
                            <Input
                              className={`h-7 w-full px-1.5 text-center text-xs ${orderError ? "border-destructive" : ""}`}
                              value={displayVal}
                              placeholder="順序"
                              aria-label={`${script.title} 章節順序`}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPendingOrders((prev) => ({ ...prev, [script.id]: val }));
                                const result = normalizeEditableSeriesOrder(val);
                                setOrderErrors((prev) => {
                                  const next = { ...prev };
                                  if (result.valid) delete next[script.id];
                                  else next[script.id] = result.error;
                                  return next;
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              onBlur={() => {
                                const raw = pendingOrders[script.id];
                                if (raw === undefined) return;
                                const result = normalizeEditableSeriesOrder(raw);
                                setPendingOrders((prev) => {
                                  const next = { ...prev };
                                  delete next[script.id];
                                  return next;
                                });
                                if (!result.valid) {
                                  // Revert display, clear error
                                  setOrderErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[script.id];
                                    return next;
                                  });
                                  return;
                                }
                                if (result.order !== script.seriesOrder) {
                                  onReorderScript?.(script.id, result.order);
                                }
                              }}
                            />
                            {orderError ? (
                              <span className="text-[10px] text-destructive leading-none">{orderError}</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground leading-none">
                                {script.isPrologue ? "設定/背景" : script.isMissingOrder ? "未設定" : `第 ${script.seriesOrder} 作`}
                              </span>
                            )}
                          </div>

                          {/* Title + status */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{script.title || "Untitled"}</p>
                            <p className="text-xs text-muted-foreground">{script.status || "private"}</p>
                          </div>

                          {/* Detach */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={() => onDetachScript?.(script.id, selected.id)}
                          >
                            移出
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </PublisherFormRow>

            {/* Attach existing script */}
            {attachableScripts.length > 0 && (
              <PublisherFormRow label="加入現有作品" hint="選擇尚未加入此系列的作品，設定章節順序後加入。">
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <select
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                      value={attachScriptId}
                      onChange={(e) => setAttachScriptId(e.target.value)}
                      aria-label="選擇作品"
                    >
                      <option value="">— 選擇作品 —</option>
                      {attachableScripts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title || "Untitled"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <Input
                      className={`h-8 w-20 shrink-0 text-xs ${attachOrderError ? "border-destructive" : ""}`}
                      value={attachOrder}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAttachOrder(val);
                        const result = normalizeEditableSeriesOrder(val);
                        setAttachOrderError(result.valid ? "" : result.error);
                      }}
                      placeholder="順序"
                      aria-label="章節順序"
                    />
                    {attachOrderError && (
                      <span className="text-[10px] text-destructive leading-none">{attachOrderError}</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!attachScriptId || Boolean(attachOrderError)}
                    onClick={() => {
                      if (!attachScriptId) return;
                      const result = normalizeEditableSeriesOrder(attachOrder);
                      if (!result.valid) return;
                      onAttachScript?.(attachScriptId, selected.id, result.order);
                      setAttachScriptId("");
                      setAttachOrder("");
                      setAttachOrderError("");
                    }}
                  >
                    加入
                  </Button>
                </div>
              </PublisherFormRow>
            )}
          </div>
        )}
      </div>

      <MediaPicker
        open={isMediaPickerOpen}
        onOpenChange={setIsMediaPickerOpen}
        cropPurpose="cover"
        onSelect={(url) => {
          if (!url) return;
          setSeriesDraft((prev) => ({ ...prev, coverUrl: url }));
        }}
        onSelectMedia={(selection) => {
          if (!selection?.url) return;
          setSeriesDraft((prev) => ({ ...prev, coverUrl: selection.url, coverCrop: selection.crop || null }));
        }}
      />
    </PublisherSplitPanel>
  );
}
