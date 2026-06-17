import React from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";

export interface ScriptMetadataSeriesOption {
  id: string;
  name: string;
}

export interface ScriptMetadataSeriesSectionProps {
  rowLabelClassName: string;
  seriesExpanded: boolean;
  setSeriesExpanded: (value: boolean) => void;
  seriesId: string | null;
  setSeriesId: (value: string | null) => void;
  setSeriesName: (value: string) => void;
  seriesOrder: string | number;
  setSeriesOrder: (value: string) => void;
  quickSeriesName: string;
  setQuickSeriesName: (value: string) => void;
  showSeriesQuickCreate: boolean;
  setShowSeriesQuickCreate: (value: boolean | ((prev: boolean) => boolean)) => void;
  focusSeriesSelect: () => void;
  handleQuickCreateSeries: () => void;
  isCreatingSeries: boolean;
  seriesOptions: ScriptMetadataSeriesOption[];
}

export function ScriptMetadataSeriesSection({
  rowLabelClassName,
  seriesExpanded,
  setSeriesExpanded,
  seriesId,
  setSeriesId,
  setSeriesName,
  seriesOrder,
  setSeriesOrder,
  quickSeriesName,
  setQuickSeriesName,
  showSeriesQuickCreate,
  setShowSeriesQuickCreate,
  focusSeriesSelect,
  handleQuickCreateSeries,
  isCreatingSeries,
  seriesOptions,
}: ScriptMetadataSeriesSectionProps) {
  const selectedSeries = React.useMemo(
    () => (seriesOptions || []).find((item) => item.id === seriesId) ?? null,
    [seriesId, seriesOptions]
  );

  const clearSeries = React.useCallback(() => {
    setSeriesExpanded(false);
    setSeriesId("");
    setSeriesName("");
    setSeriesOrder("");
    setQuickSeriesName("");
    setShowSeriesQuickCreate(false);
  }, [setQuickSeriesName, setSeriesExpanded, setSeriesId, setSeriesName, setSeriesOrder, setShowSeriesQuickCreate]);

  const enableSeries = React.useCallback(() => {
    setSeriesExpanded(true);
    focusSeriesSelect();
  }, [focusSeriesSelect, setSeriesExpanded]);

  const canCreateSeries = Boolean(String(quickSeriesName || "").trim()) && !isCreatingSeries;

  return (
    <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
      <div className={rowLabelClassName}>
        <div className="text-sm font-medium text-foreground">系列資訊</div>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/10 p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">這個作品是否屬於系列</span>
              <Badge variant={seriesExpanded ? "default" : "outline"}>
                {seriesExpanded ? "已加入系列" : "獨立作品"}
              </Badge>
            </div>
            <p className="max-w-2xl text-xs text-muted-foreground">
              系列會影響公開頁的章節排序、系列頁歸檔與讀者章節導覽。若只是單篇作品，保持獨立即可。
            </p>
          </div>
          <div className="inline-flex shrink-0 gap-1 rounded-md border bg-background p-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={!seriesExpanded ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""}
              onClick={clearSeries}
            >
              不加入系列
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={seriesExpanded ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""}
              onClick={enableSeries}
            >
              加入系列
            </Button>
          </div>
        </div>

        {seriesExpanded ? (
          <div className="space-y-4 rounded-lg border border-border/70 bg-background p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="metadata-series-name">
                  選擇系列
                </label>
                <Select
                  value={seriesId || undefined}
                  onValueChange={(value) => {
                    setSeriesId(value);
                    const nextSeries = (seriesOptions || []).find((item) => item.id === value);
                    setSeriesName(nextSeries?.name || "");
                    if (value) setShowSeriesQuickCreate(false);
                  }}
                >
                  <SelectTrigger id="metadata-series-name">
                    <SelectValue placeholder={seriesOptions.length ? "請選擇系列" : "尚無可選系列"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(seriesOptions || []).map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSeries ? (
                  <p className="text-xs text-muted-foreground">目前系列：{selectedSeries.name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">可選擇既有系列，或在下方建立新系列後自動選取。</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="metadata-series-order">
                  章節順序
                </label>
                <Input
                  id="metadata-series-order"
                  type="number"
                  min="0"
                  step="1"
                  value={seriesOrder}
                  onChange={(e) => setSeriesOrder(e.target.value)}
                  placeholder="例如 0 或 1"
                />
                <p className="text-xs text-muted-foreground">0 可作為設定集、序章或外傳。</p>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-border bg-muted/10 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">建立新系列</div>
                  <p className="text-xs text-muted-foreground">只建立系列基本資料；封面、摘要與章節管理可到發布工作室的系列管理補齊。</p>
                </div>
                <Button
                  type="button"
                  variant={showSeriesQuickCreate ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => setShowSeriesQuickCreate((prev: boolean) => !prev)}
                >
                  {showSeriesQuickCreate ? "收合建立區" : "建立新系列"}
                </Button>
              </div>

              {showSeriesQuickCreate && (
                <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    id="metadata-quick-series-name"
                    value={quickSeriesName || ""}
                    onChange={(e) => setQuickSeriesName(e.target.value)}
                    placeholder="輸入新系列名稱"
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (canCreateSeries) handleQuickCreateSeries();
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleQuickCreateSeries} disabled={!canCreateSeries}>
                    {isCreatingSeries ? "建立中..." : "建立並選取"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            目前會以獨立作品發布，不會出現在系列頁或章節導覽中。
          </div>
        )}
      </div>
    </div>
  );
}
