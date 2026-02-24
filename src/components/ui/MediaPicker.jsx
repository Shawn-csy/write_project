import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "./button";
import { MEDIA_FILE_ACCEPT, formatBytes, optimizeImageForUpload } from "../../lib/mediaLibrary";
import { getMediaObjects, uploadMediaObject } from "../../lib/db";
import { useI18n } from "../../contexts/I18nContext";
import { Loader2, Image as ImageIcon } from "lucide-react";

export function MediaPicker({ open, onOpenChange, onSelect }) {
    const { t } = useI18n();
    const [items, setItems] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [error, setError] = React.useState("");

    const loadMedia = React.useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const res = await getMediaObjects();
            setItems(Array.isArray(res?.items) ? res.items : []);
        } catch (e) {
            setError(e?.message || t("mediaLibrary.uploadFailed", "載入失敗"));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    React.useEffect(() => {
        if (open) {
            loadMedia();
        }
    }, [open, loadMedia]);

    const handleUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        setError("");
        setIsUploading(true);
        try {
            for (const file of files) {
                const optimized = await optimizeImageForUpload(file);
                if (!optimized.ok) {
                    throw new Error(optimized.error || t("mediaLibrary.uploadFailed", "上傳失敗"));
                }
                await uploadMediaObject(optimized.file, "library");
            }
            await loadMedia();
        } catch (e) {
            setError(String(e?.message || t("mediaLibrary.uploadFailed", "上傳失敗")));
        } finally {
            setIsUploading(false);
            event.target.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="px-1 shrink-0">
                    <DialogTitle>{t("mediaLibrary.title", "媒體庫")}</DialogTitle>
                    <DialogDescription>{t("mediaLibrary.selectDesc", "點擊以選擇圖片，或上傳新圖片至媒體庫")}</DialogDescription>
                </DialogHeader>

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
                            onChange={handleUpload}
                            disabled={isUploading || isLoading}
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
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        if (item.url) {
                                            onSelect(item.url);
                                            onOpenChange(false);
                                        }
                                    }}
                                    className="group text-left overflow-hidden rounded-md border bg-background hover:ring-2 hover:ring-primary hover:border-transparent transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <div className="aspect-square bg-muted/30">
                                        <img
                                            src={item.url}
                                            alt={item.name || "media"}
                                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="space-y-1 p-2 border-t group-hover:bg-muted/30 transition-colors">
                                        <p className="truncate text-xs font-medium">{item.name || t("mediaLibrary.unnamed", "未命名資料")}</p>
                                        <p className="text-[11px] text-muted-foreground">{formatBytes(item.sizeBytes || 0)}</p>
                                    </div>
                                </button>
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
