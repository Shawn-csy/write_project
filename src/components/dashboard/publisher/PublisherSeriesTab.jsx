import React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";

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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <div className="rounded-lg border bg-card p-4">
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
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {seriesList.map((series) => (
            <button
              key={series.id}
              type="button"
              className={`w-full rounded-md border p-3 text-left transition-colors ${
                selectedSeriesId === series.id
                  ? "border-primary bg-primary/5"
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

      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{selected ? "編輯系列" : "建立系列"}</h3>
          {selected && <Badge variant="secondary">ID: {selected.id.slice(0, 8)}</Badge>}
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">系列名稱</label>
          <Input
            value={seriesDraft.name}
            onChange={(e) => setSeriesDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例如：星海遠征"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">系列摘要</label>
          <Textarea
            value={seriesDraft.summary}
            onChange={(e) => setSeriesDraft((prev) => ({ ...prev, summary: e.target.value }))}
            placeholder="簡短介紹這個系列。"
            rows={4}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">系列封面圖</label>
          <Input
            value={seriesDraft.coverUrl}
            onChange={(e) => setSeriesDraft((prev) => ({ ...prev, coverUrl: e.target.value }))}
            placeholder="https://..."
          />
        </div>
        {seriesDraft.coverUrl && (
          <div className="h-36 w-24 overflow-hidden rounded-md border bg-muted/20">
            <img
              src={seriesDraft.coverUrl}
              alt="series cover preview"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex items-center gap-2 pt-2">
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

        {selected && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">系列作品</h4>
              <Badge variant="outline">{seriesScripts.length} 部</Badge>
            </div>
            {seriesScripts.length === 0 ? (
              <p className="text-xs text-muted-foreground">目前此系列沒有作品。</p>
            ) : (
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
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
        )}
      </div>
    </div>
  );
}
