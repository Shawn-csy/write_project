import React from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { MediaPicker } from "../../ui/MediaPicker";
import { ImageCropDialog } from "../../ui/ImageCropDialog";
import { MEDIA_FILE_ACCEPT } from "../../../lib/mediaLibrary";
import { useI18n } from "../../../contexts/I18nContext";
import { useMetadataCoverUpload } from "../../../hooks/dashboard/useMetadataCoverUpload";
import { getMediaCropStyle } from "../../../lib/mediaCropRef";

interface Props {
  author: string;
  setAuthor: (value: string) => void;
  coverUrl: string | null;
  setCoverUrl: (value: string) => void;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  setCoverCrop?: (value: { cx?: number; cy?: number; zoom?: number } | null) => void;
  recommendedErrors?: Record<string, string | boolean | undefined>;
  className?: string;
}

export function MetadataAuthorCoverCard({ author, setAuthor, coverUrl, setCoverUrl, coverCrop = null, setCoverCrop, recommendedErrors = {}, className = "" }: Props) {
  const { t } = useI18n();
  const {
    coverPreviewFailed, setCoverPreviewFailed,
    coverUploadError, coverUploadWarning,
    isMediaPickerOpen, setIsMediaPickerOpen,
    cropOpen, setCropOpen, cropSource,
    coverGuide, applyCoverUpload, handleCoverUpload, handleMediaPickerSelect, handleMediaPickerSelectMedia,
  } = useMetadataCoverUpload({ setCoverUrl, setCoverCrop });

  const normalizedCoverUrl = String(coverUrl || "");
  const cropCover = getMediaCropStyle(normalizedCoverUrl, coverCrop);
  const hasInvalidCoverUrl = Boolean(normalizedCoverUrl.trim()) && !/^(https?:\/\/|\/)/i.test(normalizedCoverUrl.trim());

  return (
    <>
      <div className={`grid gap-4 rounded-xl border border-border/70 bg-background p-4 shadow-sm h-fit ${className}`}>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="metadata-author">{t("metadataDetails.author")}</label>
          <Input id="metadata-author" name="metadataAuthor" value={author} onChange={e => setAuthor(e.target.value)} placeholder="覆蓋顯示的作者名稱..." />
          <div className="text-xs text-muted-foreground">{t("metadataDetails.authorTip")}</div>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="metadata-cover-url">{t("metadataDetails.coverUrl")}</label>
          <Input id="metadata-cover-url" name="metadataCoverUrl" value={coverUrl || ""} onChange={e => { setCoverUrl(e.target.value); setCoverCrop?.(null); }} placeholder="https://..." />
          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
              {t("metadataDetails.uploadImage")}
              <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={handleCoverUpload} />
            </label>
            <Button type="button" variant="secondary" size="sm" className="h-8 text-xs border bg-primary/5 hover:bg-primary/10 text-primary border-primary/20" onClick={() => setIsMediaPickerOpen(true)}>
              {t("mediaLibrary.selectFromLibrary", "從媒體庫選擇")}
            </Button>
          </div>
          <div className="space-y-0.5 text-[11px] text-muted-foreground">
            <p>{coverGuide.supported}</p>
            <p>{coverGuide.recommended}</p>
          </div>
          {coverUploadError && <p className="text-xs text-destructive">{coverUploadError}</p>}
          {coverUploadWarning && <p className="text-xs text-[color:var(--license-term-fg)]">{coverUploadWarning}</p>}
          <div className="mt-1 h-28 w-full overflow-hidden rounded-md border bg-muted/20">
            {coverUrl && !coverPreviewFailed ? (
              <img src={cropCover.src} alt="cover preview" style={cropCover.style} className="h-full w-full object-cover" onLoad={() => setCoverPreviewFailed(false)} onError={() => setCoverPreviewFailed(true)} />
            ) : (
              <CoverPlaceholder title={author || "Untitled"} compact />
            )}
          </div>
          {coverUrl && coverPreviewFailed && <p className="text-xs text-muted-foreground">{t("metadataDetails.coverPreviewFail")}</p>}
          {recommendedErrors.cover && <p className="text-xs text-[color:var(--license-term-fg)]">{t("metadataDetails.coverTip")}</p>}
          {hasInvalidCoverUrl && <p className="text-xs text-[color:var(--license-term-fg)]">{t("metadataDetails.urlTip")}</p>}
        </div>
      </div>

      <MediaPicker open={isMediaPickerOpen} onOpenChange={setIsMediaPickerOpen} cropPurpose="cover" onSelect={handleMediaPickerSelect} onSelectMedia={handleMediaPickerSelectMedia} />
      <ImageCropDialog open={cropOpen} onOpenChange={setCropOpen} source={cropSource} purpose="cover" onConfirm={applyCoverUpload} />
    </>
  );
}
