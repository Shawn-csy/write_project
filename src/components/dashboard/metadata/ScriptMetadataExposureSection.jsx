import React from "react";
import { X } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { getImageUploadGuide, MEDIA_FILE_ACCEPT } from "../../../lib/mediaLibrary";

export function ScriptMetadataExposureSection({
  t,
  title,
  author,
  setAuthor,
  getRowLabelClass,
  coverUrl,
  setCoverUrl,
  handleCoverUpload,
  setIsMediaPickerOpen,
  coverUploadError,
  coverUploadWarning,
  coverPreviewFailed,
  setCoverPreviewFailed,
  recommendedErrorMap,
  seriesExpanded,
  setSeriesExpanded,
  setSeriesId,
  setSeriesName,
  setSeriesOrder,
  setQuickSeriesName,
  setShowSeriesQuickCreate,
  focusSeriesSelect,
  seriesId,
  seriesOptions,
  showSeriesQuickCreate,
  quickSeriesName,
  setQuickSeriesName: setQuickSeriesNameInput,
  handleQuickCreateSeries,
  isCreatingSeries,
  seriesOrder,
  setSeriesOrder: setSeriesOrderInput,
  newTagInput,
  setNewTagInput,
  handleAddTag,
  currentTags,
  handleRemoveTag,
}) {
  const coverGuide = React.useMemo(() => getImageUploadGuide("cover"), []);
  return (
    <section id="metadata-section-exposure" className="space-y-3 scroll-mt-24">
      <h3 className="text-base font-semibold">{t("scriptMetadataDialog.tabExposure", "曝光資訊")}</h3>
      <div className="rounded-xl border border-border/70 bg-background shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("recommended")}>顯示作者</div>
          <div className="space-y-2 p-4">
            <Input id="metadata-author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="覆蓋顯示的作者名稱..." />
          </div>
        </div>
        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("recommended")}>
            <div className="text-sm font-medium text-foreground">封面</div>
            <div className="mt-1 text-xs text-muted-foreground">公開頁卡片與閱讀頁封面</div>
          </div>
          <div className="space-y-2 p-4">
            <Input id="metadata-cover-url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                上傳圖片
                <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={handleCoverUpload} />
              </label>
              <Button type="button" variant="secondary" size="sm" className="h-8 text-xs" onClick={() => setIsMediaPickerOpen(true)}>
                從媒體庫選擇
              </Button>
            </div>
            <div className="space-y-0.5 text-[11px] text-muted-foreground">
              <p>{coverGuide.supported}</p>
              <p>{coverGuide.recommended}</p>
            </div>
            {coverUploadError && <p className="text-xs text-destructive">{coverUploadError}</p>}
            {coverUploadWarning && <p className="text-xs text-amber-700 dark:text-amber-300">{coverUploadWarning}</p>}
            <div className="mt-1 h-28 w-full overflow-hidden rounded-md border bg-muted/20">
              {coverUrl && !coverPreviewFailed ? (
                <img
                  src={coverUrl}
                  alt="cover preview"
                  className="h-full w-full object-cover"
                  onLoad={() => setCoverPreviewFailed(false)}
                  onError={() => setCoverPreviewFailed(true)}
                />
              ) : (
                <CoverPlaceholder title={title || "Untitled"} compact />
              )}
            </div>
            {coverUrl && coverPreviewFailed && (
              <p className="text-xs text-muted-foreground">{t("metadataDetails.coverPreviewFail")}</p>
            )}
            {recommendedErrorMap.cover && <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataDetails.coverTip")}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("recommended")}>
            <div className="text-sm font-medium text-foreground">系列資訊</div>
            <div className="mt-1 text-xs text-muted-foreground">選擇加入系列後再填寫細節</div>
          </div>
          <div className="space-y-3 p-4">
            <div className="inline-flex gap-1 rounded-md border bg-background p-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={!seriesExpanded ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""}
                onClick={() => {
                  setSeriesExpanded(false);
                  setSeriesId("");
                  setSeriesName("");
                  setSeriesOrder("");
                  setQuickSeriesName("");
                  setShowSeriesQuickCreate(false);
                }}
              >
                不加入系列
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={seriesExpanded ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""}
                onClick={() => {
                  setSeriesExpanded(true);
                  focusSeriesSelect();
                }}
              >
                加入系列
              </Button>
            </div>
            {seriesExpanded && (
              <div className="space-y-3 rounded-md border border-border/70 bg-muted/10 p-3">
                <Select
                  value={seriesId || undefined}
                  onValueChange={(value) => {
                    setSeriesId(value);
                    const selectedSeries = (seriesOptions || []).find((item) => item.id === value);
                    setSeriesName(selectedSeries?.name || "");
                    if (value) setShowSeriesQuickCreate(false);
                  }}
                >
                  <SelectTrigger id="metadata-series-name">
                    <SelectValue placeholder="請選擇系列" />
                  </SelectTrigger>
                  <SelectContent>
                    {(seriesOptions || []).map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={showSeriesQuickCreate ? "outline" : "secondary"}
                    size="sm"
                    onClick={() => setShowSeriesQuickCreate((prev) => !prev)}
                  >
                    {showSeriesQuickCreate ? "收合建立區" : "建立新系列"}
                  </Button>
                  <span className="text-xs text-muted-foreground">已選擇既有系列可略過</span>
                </div>
                {showSeriesQuickCreate && (
                  <div className="flex gap-2">
                    <Input
                      id="metadata-quick-series-name"
                      value={quickSeriesName}
                      onChange={(e) => setQuickSeriesNameInput(e.target.value)}
                      placeholder="輸入新系列名稱"
                      onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing) return;
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        handleQuickCreateSeries();
                      }}
                    />
                    <Button type="button" variant="secondary" onClick={handleQuickCreateSeries} disabled={!String(quickSeriesName || "").trim() || isCreatingSeries}>
                      {isCreatingSeries ? "建立中..." : "建立"}
                    </Button>
                  </div>
                )}
                <Input
                  id="metadata-series-order"
                  type="number"
                  min="0"
                  step="1"
                  value={seriesOrder}
                  onChange={(e) => setSeriesOrderInput(e.target.value)}
                  placeholder="系列順序，例如 0 或 1"
                />
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("recommended")}>
            <div className="text-sm font-medium text-foreground">標籤</div>
            <div className="mt-1 text-xs text-muted-foreground">可輸入後 Enter 新增</div>
          </div>
          <div className="space-y-2 p-4">
            <div className="flex gap-2">
              <Input
                id="metadata-new-tag"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="搜尋或輸入新標籤..."
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={() => handleAddTag()}>新增</Button>
            </div>
            {recommendedErrorMap.tags && <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataDetails.tagsTip")}</p>}
            <div className="flex flex-wrap gap-2">
              {(currentTags || []).map((tag) => (
                <Badge key={tag.id} variant="secondary" className={`${tag.color || "bg-slate-200"} text-foreground pl-3 pr-1.5 py-1 flex items-center`}>
                  {tag.name}
                  <button type="button" className="ml-1.5 rounded-full p-0.5 hover:bg-black/20 dark:hover:bg-white/20" onClick={() => handleRemoveTag(tag.id)}>
                    <X className="h-3 w-3 opacity-70" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
