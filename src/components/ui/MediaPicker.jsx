import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "./button";
import { MEDIA_FILE_ACCEPT, formatBytes } from "../../lib/mediaLibrary";
import { useI18n } from "../../contexts/I18nContext";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { useMediaLibrary } from "../../hooks/useMediaLibrary";

export function MediaPicker({ open, onOpenChange, onSelect }) {
    const { t } = useI18n();
    const {
        items,
        stats,
        error,
        isLoading,
        isUploading,
        deletingUrl,
        refresh,
        uploadFromInput,
        deleteByUrl,
    } = useMediaLibrary({ t });

    React.useEffect(() => {
        if (open) {
            refresh();
        }
    }, [open, refresh]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="px-1 shrink-0">
                    <DialogTitle>{t("mediaLibrary.title", "媒體庫")}</DialogTitle>
                    <DialogDescription>{t("mediaLibrary.selectDesc", "點擊以選擇圖片，或上傳新圖片至媒體庫")}</DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border bg-muted/20 p-3 mt-2 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{t("mediaLibrary.usage", "媒體庫使用量")}</span>
                        <span className="text-muted-foreground">{formatBytes(stats.usedBytes)} / {formatBytes(stats.maxBytes)}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((stats.ratio || 0) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("mediaLibrary.itemCountDesc", "{count} 個媒體檔可重複使用。").replace("{count}", String(stats.count))}</p>
                </div>

                <div className="flex items-center justify-between mt-2 shrink-0">
                    <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted font-medium transition-colors">
                        {isUploading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                {t("mediaLibrary.uploading", "上傳中...")}
                            </>
                        ) : (
                            t("mediaLibrary.addToLibrary", "上傳新圖片")
                        )}
                        <input
                            type="file"
                            accept={MEDIA_FILE_ACCEPT}
                            multiple
                            className="hidden"
                            onChange={uploadFromInput}
                            disabled={isUploading || isLoading || !!deletingUrl}
                        />
                    </label>
                    {error && <span className="text-xs text-destructive">{error}</span>}
                </div>

                <div className="flex-1 overflow-y-auto min-h-[300px] mt-4 border rounded-md p-4 bg-muted/10">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p className="text-sm">{t("common.loading", "載入中...")}</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm">{t("mediaLibrary.empty", "媒體庫目前為空")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="group overflow-hidden rounded-md border bg-background transition-all hover:border-transparent hover:ring-2 hover:ring-primary"
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (item.url) {
                                                onSelect(item.url);
                                                onOpenChange(false);
                                            }
                                        }}
                                        className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <div className="aspect-square bg-muted/30">
                                        <img
                                            src={item.url}
                                            alt={item.name || "media"}
                                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                        </div>
                                    </button>
                                    <div className="space-y-1 border-t p-2 transition-colors group-hover:bg-muted/30">
                                        <p className="truncate text-xs font-medium">{item.name || t("mediaLibrary.unnamed", "未命名資料")}</p>
                                        <p className="text-[11px] text-muted-foreground">{formatBytes(item.sizeBytes || 0)}</p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-full text-xs text-destructive hover:text-destructive"
                                            disabled={isUploading || isLoading || !!deletingUrl}
                                            onClick={() => {
                                                deleteByUrl(item.url);
                                            }}
                                        >
                                            {deletingUrl === item.url ? t("common.loading", "載入中...") : t("common.remove", "刪除")}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="mt-4 flex justify-end shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
                        {t("common.cancel", "取消")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
