import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "./button";
import { useI18n } from "../../contexts/I18nContext";
import { useMediaLibrary } from "../../hooks/useMediaLibrary";
import { ImageCropDialog } from "./ImageCropDialog";
import { uploadMediaObject } from "../../lib/api/media";
import { MediaLibraryBrowser } from "../media/MediaLibraryBrowser";
import { encodeMediaCropRef } from "../../lib/mediaCropRef";

interface MediaPickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (url: string) => void;
    cropPurpose?: "avatar" | "logo" | "cover" | "banner" | "generic" | null;
}

interface CropSource {
    url: string;
    name: string;
}

export function MediaPicker({ open, onOpenChange, onSelect, cropPurpose = null }: MediaPickerProps): React.JSX.Element {
    const { t } = useI18n();
    const [query, setQuery] = React.useState("");
    const [sortBy, setSortBy] = React.useState<"newest" | "name" | "size">("newest");
    const [selectedId, setSelectedId] = React.useState("");
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
    const [cropOpen, setCropOpen] = React.useState<boolean>(false);
    const [cropSource, setCropSource] = React.useState<CropSource | null>(null);

    React.useEffect(() => {
        if (open) {
            refresh();
        }
    }, [open, refresh]);

    const handleSelectItem = React.useCallback((item: { url?: string; name?: string }) => {
        if (!item?.url) return;
        if (!cropPurpose) {
            onSelect(item.url);
            onOpenChange(false);
            return;
        }
        setCropSource({ url: item.url, name: item.name || "media-image" });
        setCropOpen(true);
    }, [cropPurpose, onOpenChange, onSelect]);

    const selectedItem = React.useMemo(
        () => items.find((item) => item.id === selectedId) || null,
        [items, selectedId]
    );

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="px-1 shrink-0">
                    <DialogTitle>{t("mediaLibrary.title", "媒體庫")}</DialogTitle>
                    <DialogDescription>{t("mediaLibrary.selectDesc", "點擊以選擇圖片，或上傳新圖片至媒體庫")}</DialogDescription>
                </DialogHeader>

                <MediaLibraryBrowser
                    className="flex-1 min-h-0"
                    items={items}
                    stats={stats}
                    isLoading={isLoading}
                    isUploading={isUploading}
                    deletingUrl={deletingUrl}
                    error={error}
                    query={query}
                    setQuery={setQuery}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                    onUploadChange={uploadFromInput}
                    onDelete={deleteByUrl}
                    onPrimaryAction={handleSelectItem}
                    primaryActionLabel={cropPurpose ? t("mediaLibrary.cropThenUse", "裁切後使用") : t("common.select", "選擇")}
                    rightTopActions={cropPurpose && selectedItem?.url ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                onSelect(selectedItem.url);
                                onOpenChange(false);
                            }}
                        >
                            {t("mediaLibrary.useOriginalDirectly", "直接使用原圖")}
                        </Button>
                    ) : null}
                />
                
                <div className="mt-4 flex justify-end shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
                        {t("common.cancel", "取消")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
        <ImageCropDialog
            open={cropOpen}
            onOpenChange={setCropOpen}
            source={cropSource}
            purpose={cropPurpose || "generic"}
            confirmLabel={t("mediaLibrary.cropThenUse", "裁切後使用")}
            applyCropRefLabel={t("mediaLibrary.applyCropFrame", "套用裁切框")}
            onApplyCropRef={cropSource?.url ? (crop) => {
                onSelect(encodeMediaCropRef(cropSource.url as string, crop));
                onOpenChange(false);
            } : undefined}
            onConfirm={async (croppedFile: File) => {
                const uploaded = await uploadMediaObject(croppedFile, cropPurpose || "library") as { url?: string } | null;
                const url = String(uploaded?.url || "").trim();
                if (!url) throw new Error(t("mediaLibrary.uploadFailed", "上傳失敗"));
                onSelect(url);
                onOpenChange(false);
            }}
        />
        </>
    );
}
