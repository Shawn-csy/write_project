import React from "react";
import { Check, Image as ImageIcon, Loader2, Search, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { MEDIA_FILE_ACCEPT, formatBytes } from "../../lib/mediaLibrary";
import type { CloudMediaItem } from "../../hooks/useMediaLibrary";
import { useI18n } from "../../contexts/I18nContext";

type SortBy = "newest" | "name" | "size";

interface Props {
  items: CloudMediaItem[];
  stats: { count: number; usedBytes: number; maxBytes: number; ratio: number };
  isLoading: boolean;
  isUploading: boolean;
  deletingUrl?: string;
  error?: string;
  query: string;
  setQuery: (value: string) => void;
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  selectedId: string;
  setSelectedId: (value: string) => void;
  onUploadChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (url: string) => void;
  onPrimaryAction?: (item: CloudMediaItem) => void;
  primaryActionLabel?: string;
  rightTopActions?: React.ReactNode;
  className?: string;
}

export function MediaLibraryBrowser({
  items,
  stats,
  isLoading,
  isUploading,
  deletingUrl = "",
  error = "",
  query,
  setQuery,
  sortBy,
  setSortBy,
  selectedId,
  setSelectedId,
  onUploadChange,
  onDelete,
  onPrimaryAction,
  primaryActionLabel,
  rightTopActions,
  className = "",
}: Props) {
  const { t } = useI18n();

  const filteredItems = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const base = items.filter((item) => {
      if (!keyword) return true;
      const name = String(item.name || "").toLowerCase();
      const url = String(item.url || "").toLowerCase();
      return name.includes(keyword) || url.includes(keyword);
    });
    const sorted = [...base];
    if (sortBy === "name") sorted.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    if (sortBy === "size") sorted.sort((a, b) => Number(b.sizeBytes || 0) - Number(a.sizeBytes || 0));
    return sorted;
  }, [items, query, sortBy]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null;

  React.useEffect(() => {
    if (!filteredItems.length) {
      if (selectedId) setSelectedId("");
      return;
    }
    if (!selectedId || !filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId, setSelectedId]);

  return (
    <div className={`flex min-h-0 flex-col gap-3 ${className}`}>
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">{t("mediaLibrary.usage", "媒體庫使用量")}</span>
          <span className="text-muted-foreground">
            {formatBytes(stats.usedBytes)} / {Number.isFinite(stats.maxBytes) ? formatBytes(stats.maxBytes) : "無上限"}
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((stats.ratio || 0) * 100)}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("mediaLibrary.itemCountDesc", "{count} 個媒體檔可重複使用。").replace("{count}", String(stats.count))}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onUploadChange && (
            <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted font-medium transition-colors">
              {isUploading ? t("mediaLibrary.uploading", "上傳中...") : t("mediaLibrary.addToLibrary", "上傳新圖片")}
              <input type="file" accept={MEDIA_FILE_ACCEPT} multiple className="hidden" onChange={onUploadChange} disabled={isUploading || isLoading || !!deletingUrl} />
            </label>
          )}
          {rightTopActions}
        </div>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search", "搜尋")}
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="newest">{t("common.latest", "最新")}</option>
          <option value="name">{t("common.name", "名稱")}</option>
          <option value="size">{t("common.size", "大小")}</option>
        </select>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-h-0 overflow-y-auto rounded-md border bg-muted/10 p-3">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-sm">{t("common.loading", "載入中...")}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">{t("mediaLibrary.empty", "媒體庫目前為空")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filteredItems.map((item) => (
                <div key={item.id} className={`group overflow-hidden rounded-md border bg-background ${selectedItem?.id === item.id ? "ring-2 ring-primary border-primary" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    onDoubleClick={() => {
                      if (onPrimaryAction) onPrimaryAction(item);
                    }}
                    className="block w-full text-left"
                  >
                    <div className="aspect-[4/3] bg-muted/30 sm:aspect-square">
                      <img src={item.url} alt={item.name || "media"} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                  </button>
                  <div className="space-y-1 border-t p-2">
                    <p className="truncate text-xs font-medium">{item.name || t("mediaLibrary.unnamed", "未命名資料")}</p>
                    <p className="text-[11px] text-muted-foreground">{formatBytes(item.sizeBytes || 0)}</p>
                    {onPrimaryAction && (
                      <Button type="button" size="sm" className="h-7 w-full text-xs" onClick={() => onPrimaryAction(item)}>
                        {primaryActionLabel || t("common.select", "選擇")}
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="ghost" className="h-7 w-full text-xs text-destructive hover:text-destructive" disabled={isUploading || isLoading || !!deletingUrl} onClick={() => onDelete(item.url)}>
                      <Trash2 className="mr-1 h-3 w-3" />
                      {deletingUrl === item.url ? t("common.loading", "載入中...") : t("common.remove", "刪除")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden min-h-0 overflow-y-auto rounded-md border bg-muted/10 p-3 lg:block">
          {!selectedItem ? (
            <p className="text-xs text-muted-foreground">{t("mediaLibrary.empty", "媒體庫目前為空")}</p>
          ) : (
            <div className="space-y-3">
              <div className="aspect-video overflow-hidden rounded-md border bg-muted/40">
                <img src={selectedItem.url} alt={selectedItem.name || "media"} className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("common.name", "名稱")}</p>
                <p className="text-sm font-medium break-all">{selectedItem.name || t("mediaLibrary.unnamed", "未命名資料")}</p>
              </div>
              <div className="text-xs text-muted-foreground">{formatBytes(selectedItem.sizeBytes || 0)}</div>
              {onPrimaryAction && (
                <Button type="button" className="w-full" onClick={() => onPrimaryAction(selectedItem)}>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  {primaryActionLabel || t("common.select", "選擇")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
