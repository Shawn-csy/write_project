import React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { MediaPicker } from "../../ui/MediaPicker";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { PublisherFormRow } from "./PublisherFormRow";
import { PublisherTabHeader } from "./PublisherTabHeader";

export function PublisherSeriesTab({
  seriesList = [],
  selectedSeriesId = "",
  setSelectedSeriesId,
  seriesDraft,
  setSeriesDraft,
  seriesScripts = [],
  onDetachScript,
  onCreateSeries,
  onUpdateSeries,
  onDeleteSeries,
  isSaving = false,
}) {
  const selected = seriesList.find((s) => s.id === selectedSeriesId) || null;
  const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState(false);
  const [coverPreviewFailed, setCoverPreviewFailed] = React.useState(false);

  React.useEffect(() => {
    setCoverPreviewFailed(false);
  }, [seriesDraft.coverUrl]);

  return (
    <div className="space-y-4">
      <PublisherTabHeader
        title="系列管理"
        description="建立系列，設定封面與摘要，並整理每部作品的系列關聯。"
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">系列清單</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedSeriesId("");
                setSeriesDraft({ name: "", summary: "", coverUrl: "" });
              }}
            >
              新增
            </Button>
          </div>
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {seriesList.map((series) => (
              <button
                key={series.id}
                type="button"
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedSeriesId === series.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:bg-muted/20"
                }`}
                onClick={() => {
                  setSelectedSeriesId(series.id);
                  setSeriesDraft({
                    name: series.name || "",
                    summary: series.summary || "",
                    coverUrl: series.coverUrl || "",
                  });
                }}
              >
                <p className="line-clamp-1 text-sm font-medium">{series.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{series.scriptCount || 0} 部作品</p>
              </button>
            ))}
            {seriesList.length === 0 && (
              <p className="text-xs text-muted-foreground">尚未建立系列。</p>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-card p-3 md:p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{selected ? "編輯系列" : "建立系列"}</h3>
            {selected && <Badge variant="secondary">ID: {selected.id.slice(0, 8)}</Badge>}
          </div>
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
                onChange={(e) => setSeriesDraft((prev) => ({ ...prev, coverUrl: e.target.value }))}
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
                  src={seriesDraft.coverUrl}
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
                <Button
                  disabled={isSaving || !seriesDraft.name.trim()}
                  onClick={onCreateSeries}
                >
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
            <div className="border-t pt-3">
              <PublisherFormRow
                label="系列作品"
                hint="可直接把作品移出目前系列。"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">已加入作品</h4>
                    <Badge variant="outline">{seriesScripts.length} 部</Badge>
                  </div>
                  {seriesScripts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">目前此系列沒有作品。</p>
                  ) : (
                    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                      {seriesScripts.map((script) => (
                        <div
                          key={script.id}
                          className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{script.title || "Untitled"}</p>
                            <p className="text-xs text-muted-foreground">
                              {Number(script.seriesOrder) === 0
                                ? "設定/背景"
                                : Number.isFinite(Number(script.seriesOrder))
                                  ? `第 ${Number(script.seriesOrder)} 作`
                                  : "未設定順序"}
                              {" · "}
                              {script.status || "Private"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onDetachScript?.(script.id, selected.id)}
                          >
                            移出系列
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PublisherFormRow>
            </div>
          )}
        </div>
      </div>

      <MediaPicker
        open={isMediaPickerOpen}
        onOpenChange={setIsMediaPickerOpen}
        onSelect={(url) => {
          if (!url) return;
          setSeriesDraft((prev) => ({ ...prev, coverUrl: url }));
        }}
      />
    </div>
  );
}
