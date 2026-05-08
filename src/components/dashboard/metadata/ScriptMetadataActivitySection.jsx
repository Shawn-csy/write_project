import React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { getImageUploadGuide, MEDIA_FILE_ACCEPT } from "../../../lib/mediaLibrary";

export function ScriptMetadataActivitySection({
  sectionId = "metadata-section-activity",
  showTitle = true,
  t,
  getRowLabelClass,
  activityName,
  setActivityName,
  activityBannerUrl,
  setActivityBannerUrl,
  handleActivityBannerUpload,
  onOpenActivityBannerMediaPicker,
  activityBannerPreviewFailed,
  setActivityBannerPreviewFailed,
  activityBannerUploadError,
  activityBannerUploadWarning,
  activityContent,
  setActivityContent,
  activityWorkUrl,
  setActivityWorkUrl,
}) {
  const bannerGuide = React.useMemo(() => getImageUploadGuide("banner"), []);
  return (
    <section id={sectionId || undefined} className="space-y-3 scroll-mt-24">
      {showTitle && <h3 className="text-base font-semibold">{t("scriptMetadataDialog.tabActivity", "活動宣傳")}</h3>}
      <div className="rounded-xl border border-border/70 bg-background shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("recommended")}>
            <div className="text-sm font-medium text-foreground">活動名稱</div>
          </div>
          <div className="space-y-2 p-4">
            <Input
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              placeholder="例如：新作發佈活動 / 限時募集"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("recommended")}>
            <div className="text-sm font-medium text-foreground">活動 Banner</div>
          </div>
          <div className="space-y-2 p-4">
            <Input
              value={activityBannerUrl}
              onChange={(e) => setActivityBannerUrl(e.target.value)}
              placeholder="https://..."
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                上傳圖片
                <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={handleActivityBannerUpload} />
              </label>
              <Button type="button" variant="secondary" size="sm" className="h-8 text-xs" onClick={onOpenActivityBannerMediaPicker}>
                從媒體庫選擇
              </Button>
            </div>
            <div className="space-y-0.5 text-[11px] text-muted-foreground">
              <p>{bannerGuide.supported}</p>
              <p>{bannerGuide.recommended}</p>
            </div>
            {activityBannerUploadError && <p className="text-xs text-destructive">{activityBannerUploadError}</p>}
            {activityBannerUploadWarning && <p className="text-xs text-[color:var(--license-term-fg)]">{activityBannerUploadWarning}</p>}
            <div className="mt-1 h-28 w-full overflow-hidden rounded-md border bg-muted/20">
              {activityBannerUrl && !activityBannerPreviewFailed ? (
                <img
                  src={activityBannerUrl}
                  alt={activityName || "activity banner preview"}
                  className="h-full w-full object-cover"
                  onLoad={() => setActivityBannerPreviewFailed(false)}
                  onError={() => setActivityBannerPreviewFailed(true)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">活動 Banner 預覽</div>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("recommended")}>
            <div className="text-sm font-medium text-foreground">活動內容</div>
          </div>
          <div className="space-y-2 p-4">
            <Textarea
              value={activityContent}
              onChange={(e) => setActivityContent(e.target.value)}
              placeholder="輸入活動內容..."
              className="min-h-[120px]"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("recommended")}>
            <div className="text-sm font-medium text-foreground">成品連結</div>
          </div>
          <div className="space-y-2 p-4">
            <Input
              value={activityWorkUrl}
              onChange={(e) => setActivityWorkUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
