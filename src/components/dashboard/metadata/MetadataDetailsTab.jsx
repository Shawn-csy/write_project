import React from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { AlertTriangle, X, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableField } from "./SortableField";
import { SortableContactField } from "./SortableContactField";
import { optimizeImageForUpload, getImageUploadGuide, MEDIA_FILE_ACCEPT } from "../../../lib/mediaLibrary";
import { uploadMediaObject } from "../../../lib/api/media";
import { useI18n } from "../../../contexts/I18nContext";
import { MediaPicker } from "../../ui/MediaPicker";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { ImageCropDialog } from "../../ui/ImageCropDialog";

export function MetadataDetailsTab({
    status,
    coverUrl, setCoverUrl,
    currentTags,
    author, setAuthor,
    availableTags,
    newTagInput, setNewTagInput,
    handleAddTag,
    handleAddTagsBatch,
    handleRemoveTag,
    handleClearTags,
    contactFields, setContactFields,
    onAddContactField,
    handleContactFieldUpdate,
    activeSensors,
    dragDisabled, setDragDisabled,
    customFields, setCustomFields,
    addCustomField,
    addDivider,
    handleCustomFieldUpdate,
    requiredErrors = {},
    recommendedErrors = {},
    targetAudience, setTargetAudience,
    contentRating, setContentRating,
    seriesName, setSeriesName,
    seriesId, setSeriesId,
    seriesOptions = [],
    quickSeriesName,
    setQuickSeriesName,
    onQuickCreateSeries,
    isCreatingSeries = false,
    seriesOrder, setSeriesOrder,
    showStatusAlert = true,
    showAuthorCover = true,
    showAudienceRating = true,
    showSeries = true,
    showTags = true,
    showContact = true,
    showCustom = true,
    layout = "stack"
}) {
    const { t } = useI18n();
    const hasInvalidCoverUrl = Boolean(coverUrl?.trim()) && !/^(https?:\/\/|\/)/i.test(coverUrl.trim());
    const [coverPreviewFailed, setCoverPreviewFailed] = React.useState(false);
    const [coverUploadError, setCoverUploadError] = React.useState("");
    const [coverUploadWarning, setCoverUploadWarning] = React.useState("");
    const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState(false);
    const [cropOpen, setCropOpen] = React.useState(false);
    const [cropSource, setCropSource] = React.useState(null);
    const coverGuide = React.useMemo(() => getImageUploadGuide("cover"), []);

    const applyCoverUpload = async (file) => {
        const optimized = await optimizeImageForUpload(file, "cover");
        if (!optimized.ok) {
            setCoverUploadError(optimized.error || "圖片格式不正確。");
            setCoverUploadWarning("");
            return;
        }
        try {
            const uploaded = await uploadMediaObject(optimized.file, "cover");
            const nextUrl = String(uploaded?.url || "").trim();
            if (!nextUrl) throw new Error("上傳失敗。");
            setCoverUploadError("");
            setCoverUploadWarning(optimized.warning || "");
            setCoverUrl(nextUrl);
            setCoverPreviewFailed(false);
        } catch (error) {
            setCoverUploadError(error?.message || "上傳失敗。");
            setCoverUploadWarning("");
        }
    };

    const handleCoverUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCropSource({ file, name: file.name });
        setCropOpen(true);
        event.target.value = "";
    };

    const parsePastedTags = (text) =>
        String(text || "")
            .split(/,|，|、|#|\n|\t|;/)
            .map((item) => item.trim())
            .filter(Boolean);

    const handleTagPaste = (event) => {
        const text = event.clipboardData?.getData("text") || "";
        const parsed = parsePastedTags(text);
        if (parsed.length <= 1) return;
        event.preventDefault();
        handleAddTagsBatch?.(parsed);
    };

    const containerClass = layout === "grid-3"
        ? "mt-0 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        : layout === "grid-2"
            ? "mt-0 grid gap-4 md:grid-cols-2"
            : "space-y-6 mt-0";
    const cardClass = "grid gap-4 rounded-xl border border-border/70 bg-background p-4 shadow-sm h-fit";
    const authorCoverSpan = layout === "grid-3" ? "md:col-span-2 xl:col-span-2" : "";
    const audienceSpan = layout === "grid-3" ? "md:col-span-2 xl:col-span-1" : "";
    const seriesSpan = layout === "grid-3" ? "md:col-span-1 xl:col-span-1" : "";
    const tagsSpan = layout === "grid-3" ? "md:col-span-2 xl:col-span-3" : "";
    const contactSpan = layout === "grid-2" ? "md:col-span-1" : "";
    const customSpan = layout === "grid-2" ? "md:col-span-1" : "";

    return (
        <div className={containerClass}>
            {/* Status Alert */}
            {showStatusAlert && status === "Public" && (!coverUrl || currentTags.length === 0) && (
                <div className="flex w-full items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 dark:text-yellow-300" />
                    <div className="grid gap-1">
                        <h5 className="font-medium text-yellow-900 leading-none tracking-tight dark:text-yellow-200">{t("metadataDetails.suggestionTitle")}</h5>
                        <div className="text-yellow-700 opacity-90 leading-relaxed dark:text-yellow-300">
                            {t("metadataDetails.suggestionText", "").replace("{cover}", !coverUrl ? ` ${t("metadataDetails.coverWord")}` : "").replace("{and}", !coverUrl && currentTags.length === 0 ? ` ${t("metadataDetails.andWord")}` : "").replace("{tags}", currentTags.length === 0 ? ` ${t("metadataDetails.tagsWord")}` : "")}
                        </div>
                    </div>
                </div>
            )}
            {showAuthorCover && (
            <div className={`${cardClass} ${authorCoverSpan}`}>
                <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="metadata-author">{t("metadataDetails.author")}</label>
                    <Input id="metadata-author" name="metadataAuthor" value={author} onChange={e => setAuthor(e.target.value)} placeholder="覆蓋顯示的作者名稱..." />
                    <div className="text-xs text-muted-foreground">{t("metadataDetails.authorTip")}</div>
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="metadata-cover-url">{t("metadataDetails.coverUrl")}</label>
                    <Input id="metadata-cover-url" name="metadataCoverUrl" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." />
                    <div className="flex items-center gap-2 flex-wrap">
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                            {t("metadataDetails.uploadImage")}
                            <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={handleCoverUpload} />
                        </label>
                        <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 text-xs border bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                            onClick={() => setIsMediaPickerOpen(true)}
                        >
                            {t("mediaLibrary.selectFromLibrary", "從媒體庫選擇")}
                        </Button>
                    </div>
                    <div className="space-y-0.5 text-[11px] text-muted-foreground">
                        <p>{coverGuide.supported}</p>
                        <p>{coverGuide.recommended}</p>
                    </div>
                    {coverUploadError && (
                        <p className="text-xs text-destructive">{coverUploadError}</p>
                    )}
                    {coverUploadWarning && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">{coverUploadWarning}</p>
                    )}
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
                            <CoverPlaceholder title={author || "Untitled"} compact />
                        )}
                    </div>
                    {coverUrl && coverPreviewFailed && (
                        <p className="text-xs text-muted-foreground">{t("metadataDetails.coverPreviewFail")}</p>
                    )}
                    {recommendedErrors.cover && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataDetails.coverTip")}</p>
                    )}
                    {hasInvalidCoverUrl && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataDetails.urlTip")}</p>
                    )}
                </div>
            </div>
            )}

            {/* Target Audience & Content Rating Settings */}
            {showAudienceRating && (
            <div className={`grid gap-3 rounded-xl border border-border/70 bg-background p-4 shadow-sm h-fit ${audienceSpan}`}>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">觀眾與分級</label>
                    <span className="text-[10px] text-destructive tracking-wider bg-destructive/10 px-1.5 py-0.5 rounded uppercase font-semibold">必填</span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">觀眾取向</div>
                        <div className="inline-flex flex-wrap gap-1.5 rounded-md border bg-background p-1">
                            {["男性向", "女性向", "一般向"].map(opt => (
                                <Button
                                    key={`aud-${opt}`}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={`h-8 px-3 text-xs font-medium transition ${
                                        targetAudience === opt
                                            ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40"
                                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                                    }`}
                                    onClick={() => setTargetAudience(opt)}
                                >
                                    {opt}
                                </Button>
                            ))}
                        </div>
                        {requiredErrors.audience && (
                            <p className="text-xs text-destructive">{t("metadataDetails.requiredTip", "發佈前必須選擇觀眾取向")}</p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">內容分級</div>
                        <div className="inline-flex flex-wrap gap-1.5 rounded-md border bg-background p-1">
                            {["全年齡向", "成人向"].map(opt => (
                                <Button
                                    key={`rating-${opt}`}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={`h-8 px-3 text-xs font-medium transition ${
                                        contentRating === opt
                                            ? (opt === "成人向"
                                                ? "border-red-600 bg-red-600 text-white ring-2 ring-red-500/40"
                                                : "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40")
                                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                                    }`}
                                    onClick={() => setContentRating(opt)}
                                >
                                    {opt}
                                </Button>
                            ))}
                        </div>
                        {requiredErrors.rating && (
                            <p className="text-xs text-destructive">{t("metadataDetails.requiredTipRating", "發佈前必須選擇內容分級")}</p>
                        )}
                    </div>
                </div>
            </div>
            )}

            {/* Series Settings */}
            {showSeries && (
            <div className={`${cardClass} ${seriesSpan}`}>
                <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="metadata-series-name">
                        {t("metadataDetails.seriesName", "系列名稱 (Series)")}
                    </label>
                    <Select
                        value={seriesId || "__none__"}
                        onValueChange={(value) => {
                            const nextId = value === "__none__" ? "" : value;
                            setSeriesId(nextId);
                            const selectedSeries = (seriesOptions || []).find((series) => series.id === nextId);
                            setSeriesName(selectedSeries?.name || "");
                        }}
                    >
                        <SelectTrigger id="metadata-series-name">
                            <SelectValue placeholder={t("metadataDetails.seriesNamePlaceholder", "請選擇系列")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">{t("metadataDetails.noSeries", "不加入系列")}</SelectItem>
                            {(seriesOptions || []).map((series) => (
                                <SelectItem key={series.id} value={series.id}>
                                    {series.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {seriesName && (
                        <p className="text-xs text-muted-foreground">{t("metadataDetails.currentSeries", "目前系列")}：{seriesName}</p>
                    )}
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="metadata-quick-series-name">
                        {t("metadataDetails.quickCreateSeries", "快速新增系列")}
                    </label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="metadata-quick-series-name"
                            name="metadataQuickSeriesName"
                            value={quickSeriesName}
                            onChange={(e) => setQuickSeriesName?.(e.target.value)}
                            placeholder={t("metadataDetails.quickCreateSeriesPlaceholder", "輸入新系列名稱")}
                            onKeyDown={(e) => {
                                if (e.nativeEvent.isComposing) return;
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                onQuickCreateSeries?.();
                            }}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={!String(quickSeriesName || "").trim() || isCreatingSeries}
                            onClick={() => onQuickCreateSeries?.()}
                        >
                            {isCreatingSeries ? t("common.saving", "建立中...") : t("common.create", "建立")}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t("metadataDetails.quickCreateSeriesTip", "建立後會自動選取，可再到「系列管理」補上摘要與封面。")}
                    </p>
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="metadata-series-order">
                        {t("metadataDetails.seriesOrder", "系列順序 (第幾作)")}
                    </label>
                    <Input
                        id="metadata-series-order"
                        name="metadataSeriesOrder"
                        type="number"
                        min="0"
                        step="1"
                        value={seriesOrder}
                        onChange={(e) => setSeriesOrder(e.target.value)}
                        placeholder={t("metadataDetails.seriesOrderPlaceholder", "例如：0（設定集）或 1")}
                    />
                    <p className="text-xs text-muted-foreground">
                        {t("metadataDetails.seriesTip", "填入系列名稱後，公開閱讀頁會顯示同系列作品；0 可用於設定/背景篇。")}
                    </p>
                </div>
            </div>
            )}

             {/* Tags */}
            {showTags && (
            <div className={`grid gap-2 rounded-xl border border-border/70 bg-background p-4 shadow-sm h-fit ${tagsSpan}`}>
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" htmlFor="metadata-new-tag">{t("metadataDetails.tags", "標籤")}</label>
                    {currentTags.length > 0 && (
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={handleClearTags}
                        >
                            {t("metadataDetails.clearAll", "清除全部")}
                        </Button>
                    )}
                </div>
                {recommendedErrors.tags && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataDetails.tagsTip")}</p>
                )}
                
                <div className="flex flex-col gap-3 mt-1">
                    <Input
                        id="metadata-new-tag"
                        name="metadataNewTag"
                        aria-label="新增標籤"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onPaste={handleTagPaste}
                        placeholder={t("metadataDetails.tagInputPlaceholder", "搜尋或輸入新標籤...")}
                        onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing) return;
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddTag();
                            }
                        }}
                        className="h-9"
                    />

                    <div className="max-h-48 overflow-y-auto border rounded-md bg-background flex flex-wrap gap-1.5 p-2">
                         {availableTags
                            .filter(t => t.name.toLowerCase().includes(newTagInput.toLowerCase()))
                            .filter(t => !currentTags.some(ct => ct.id === t.id))
                            .map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    className="px-2.5 py-1 text-xs rounded-full border bg-muted/30 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleAddTag(t.name);
                                    }}
                                >
                                    <Plus className="w-3 h-3 mr-1 opacity-60" /> {t.name}
                                </button>
                            ))
                         }
                         {newTagInput.trim() && !availableTags.find(t => t.name.toLowerCase() === newTagInput.trim().toLowerCase()) && !currentTags.find(t => t.name.toLowerCase() === newTagInput.trim().toLowerCase()) && (
                             <button
                                 type="button"
                                 className="px-2.5 py-1 text-xs rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center"
                                 onClick={(e) => {
                                     e.preventDefault();
                                     handleAddTag(newTagInput);
                                 }}
                             >
                                 <Plus className="w-3 h-3 mr-1" /> {t("metadataDetails.addQuoted", `新增 "${newTagInput.trim()}"`).replace("{value}", newTagInput.trim())}
                             </button>
                         )}
                         {availableTags.filter(t => !currentTags.some(ct => ct.id === t.id)).length === 0 && !newTagInput.trim() && (
                             <div className="text-xs text-muted-foreground w-full text-center py-2 opacity-70">{t("metadataDetails.noTags", "無可用標籤")}</div>
                         )}
                    </div>
                </div>

                {currentTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 p-3 bg-background border rounded-md">
                        {currentTags.map(tag => {
                            const isManagedOption = ["男性向", "女性向", "一般向", "一般", "一般內容", "r-18", "r18", "18+", "全年齡向", "成人向"].includes(tag.name.toLowerCase());
                            return (
                                <Badge 
                                    key={tag.id} 
                                    variant="secondary"
                                    className={`${tag.color || "bg-slate-200"} text-foreground pl-3 pr-1.5 py-1 flex items-center`}
                                >
                                    {tag.name}
                                    {!isManagedOption && (
                                        <button 
                                            type="button"
                                            className="ml-1.5 hover:bg-black/20 dark:hover:bg-white/20 rounded-full p-0.5 transition-colors focus:outline-none flex items-center justify-center"
                                            onClick={() => handleRemoveTag(tag.id)}
                                            title={t("common.remove", "移除")}
                                        >
                                            <X className="w-3 h-3 opacity-70 hover:opacity-100" />
                                        </button>
                                    )}
                                </Badge>
                            );
                        })}
                    </div>
                )}
            </div>
            )}

            {showContact && (
            <div className={`grid gap-2 rounded-xl border border-border/70 bg-background p-4 shadow-sm h-fit ${contactSpan}`}>
                <label className="text-sm font-medium">{t("metadataDetails.contact")}</label>
                <div className="flex flex-wrap gap-2">
                    {["Email", "手機", "Discord", "IG"].map((preset) => (
                        <Button
                            key={preset}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onAddContactField(preset)}
                        >
                            + {preset}
                        </Button>
                    ))}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddContactField("")}
                    >
                        + {t("common.add")}
                    </Button>
                </div>
                <DndContext
                    sensors={activeSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        const items = contactFields.map((f) => f.id);
                        const oldIndex = items.indexOf(active.id);
                        const newIndex = items.indexOf(over.id);
                        setContactFields(arrayMove(contactFields, oldIndex, newIndex));
                    }}
                >
                    <SortableContext
                        items={contactFields.map((f) => f.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {contactFields.map((field, idx) => (
                                <SortableContactField 
                                    key={field.id} 
                                    field={field} 
                                    index={idx}
                                    onUpdate={handleContactFieldUpdate}
                                    onRemove={(i) => setContactFields(prev => prev.filter((_, idx) => idx !== i))}
                                    onFocus={() => setDragDisabled(true)}
                                    onBlur={() => setDragDisabled(false)}
                                    dragDisabled={dragDisabled}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                <div className="text-xs text-muted-foreground">{t("metadataDetails.contactTip")}</div>
            </div>
            )}

            {showCustom && (
             <div className={`grid gap-2 rounded-xl border border-border/70 bg-background p-4 shadow-sm h-fit ${customSpan}`}>
                <label className="text-sm font-medium">{t("metadataDetails.custom")}</label>
                <div className="flex flex-wrap gap-2">
                    {["角色設定", "世界觀", "備註"].map((preset) => (
                        <Button
                            key={preset}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addCustomField(preset, "")}
                        >
                            + {preset}
                        </Button>
                    ))}
                    {/* Divider Button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addDivider}
                        className="text-xs"
                    >
                         <Badge variant="outline" className="mr-2 text-[10px] font-mono px-1 py-0 border-dashed">HR</Badge>
                         {t("metadataDetails.insertDivider")}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addCustomField("", "")}
                    >
                        + 新增
                    </Button>
                </div>
                <DndContext
                    sensors={activeSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        const items = customFields.map((f) => f.id);
                        const oldIndex = items.indexOf(active.id);
                        const newIndex = items.indexOf(over.id);
                        setCustomFields(arrayMove(customFields, oldIndex, newIndex));
                    }}
                >
                    <SortableContext
                        items={customFields.map((f) => f.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {customFields.map((field, idx) => (
                                <SortableField 
                                    key={field.id} 
                                    field={field} 
                                    index={idx}
                                    onUpdate={handleCustomFieldUpdate}
                                    onRemove={(i) => setCustomFields(prev => prev.filter((_, idx) => idx !== i))}
                                    onFocus={() => setDragDisabled(true)}
                                    onBlur={() => setDragDisabled(false)}
                                    dragDisabled={dragDisabled}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                <div className="text-xs text-muted-foreground">
                    這些欄位會寫入劇本標頭，可自由新增。
                </div>
            </div>
            )}

            <MediaPicker
                open={isMediaPickerOpen}
                onOpenChange={setIsMediaPickerOpen}
                cropPurpose="cover"
                onSelect={(url) => {
                    setCoverUrl(url);
                    setCoverPreviewFailed(false);
                    setCoverUploadError("");
                    setCoverUploadWarning("");
                }}
            />
            <ImageCropDialog
                open={cropOpen}
                onOpenChange={setCropOpen}
                source={cropSource}
                purpose="cover"
                onConfirm={applyCoverUpload}
            />
        </div>
    );
}
