import React from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { AlertTriangle, X, Plus, Check } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableField } from "./SortableField";
import { SortableContactField } from "./SortableContactField";
import { optimizeImageForUpload, getImageUploadGuide, MEDIA_FILE_ACCEPT } from "../../../lib/mediaLibrary";
import { uploadMediaObject } from "../../../lib/db";
import { useI18n } from "../../../contexts/I18nContext";

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
    contactFields, setContactFields,
    onAddContactField,
    handleContactFieldUpdate,
    activeSensors,
    dragDisabled, setDragDisabled,
    customFields, setCustomFields,
    addCustomField,
    addDivider,
    handleCustomFieldUpdate,
    recommendedErrors = {}
}) {
    const { t } = useI18n();
    const hasInvalidCoverUrl = Boolean(coverUrl?.trim()) && !/^(https?:\/\/|\/)/i.test(coverUrl.trim());
    const [coverPreviewFailed, setCoverPreviewFailed] = React.useState(false);
    const [coverUploadError, setCoverUploadError] = React.useState("");
    const [coverUploadWarning, setCoverUploadWarning] = React.useState("");
    const coverGuide = React.useMemo(() => getImageUploadGuide("cover"), []);

    const handleCoverUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const optimized = await optimizeImageForUpload(file, "cover");
        if (!optimized.ok) {
            setCoverUploadError(optimized.error || "圖片格式不正確。");
            setCoverUploadWarning("");
            event.target.value = "";
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
        } finally {
            event.target.value = "";
        }
    };

    const parsePastedTags = (text) =>
        String(text || "")
            .split(/,|，|\n|\t|;/)
            .map((item) => item.trim())
            .filter(Boolean);

    const handleTagPaste = (event) => {
        const text = event.clipboardData?.getData("text") || "";
        const parsed = parsePastedTags(text);
        if (parsed.length <= 1) return;
        event.preventDefault();
        handleAddTagsBatch?.(parsed);
    };

    return (
        <div className="space-y-6 mt-0">
            {/* Status Alert */}
            {status === "Public" && (!coverUrl || currentTags.length === 0) && (
                <div className="flex w-full items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="grid gap-1">
                        <h5 className="font-medium text-yellow-900 leading-none tracking-tight">{t("metadataDetails.suggestionTitle")}</h5>
                        <div className="text-yellow-700 opacity-90 leading-relaxed">
                            {t("metadataDetails.suggestionText", "").replace("{cover}", !coverUrl ? ` ${t("metadataDetails.coverWord")}` : "").replace("{and}", !coverUrl && currentTags.length === 0 ? ` ${t("metadataDetails.andWord")}` : "").replace("{tags}", currentTags.length === 0 ? ` ${t("metadataDetails.tagsWord")}` : "")}
                        </div>
                    </div>
                </div>
            )}
            <div className="grid gap-4 p-4 border rounded-lg bg-muted/20">
                <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="metadata-author">{t("metadataDetails.author")}</label>
                    <Input id="metadata-author" name="metadataAuthor" value={author} onChange={e => setAuthor(e.target.value)} placeholder="覆蓋顯示的作者名稱..." />
                    <div className="text-xs text-muted-foreground">{t("metadataDetails.authorTip")}</div>
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="metadata-cover-url">{t("metadataDetails.coverUrl")}</label>
                    <Input id="metadata-cover-url" name="metadataCoverUrl" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." />
                    <div className="flex items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                            {t("metadataDetails.uploadImage")}
                            <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={handleCoverUpload} />
                        </label>
                        <span className="text-xs text-muted-foreground">{t("metadataDetails.uploadTip")}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{coverGuide.supported}</p>
                    <p className="text-[11px] text-muted-foreground">{coverGuide.recommended}</p>
                    {coverUploadError && (
                        <p className="text-xs text-destructive">{coverUploadError}</p>
                    )}
                    {coverUploadWarning && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">{coverUploadWarning}</p>
                    )}
                    {coverUrl && (
                        <div className="mt-1 h-28 w-full overflow-hidden rounded-md border bg-muted/20">
                            {coverPreviewFailed ? (
                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("metadataDetails.coverPreviewFail")}</div>
                            ) : (
                                <img
                                    src={coverUrl}
                                    alt="cover preview"
                                    className="h-full w-full object-cover"
                                    onLoad={() => setCoverPreviewFailed(false)}
                                    onError={() => setCoverPreviewFailed(true)}
                                />
                            )}
                        </div>
                    )}
                    {recommendedErrors.cover && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataDetails.coverTip")}</p>
                    )}
                    {hasInvalidCoverUrl && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataDetails.urlTip")}</p>
                    )}
                </div>
            </div>

             {/* Tags */}
            <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="metadata-new-tag">{t("metadataDetails.tags")}</label>
                {recommendedErrors.tags && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">{t("metadataDetails.tagsTip")}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                    {currentTags.map(tag => (
                        <Badge 
                            key={tag.id} 
                            variant="secondary"
                            className={`${tag.color || "bg-slate-200"} text-foreground`}
                        >
                            {tag.name}
                            <button 
                                className="ml-1 hover:text-red-500"
                                onClick={() => handleRemoveTag(tag.id)}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="w-fit">
                            <Plus className="w-4 h-4 mr-2" />
                            {t("metadataDetails.addTag")}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[90vw] sm:w-80 p-2" align="start">
                        <div className="p-2">
                            <Input
                                id="metadata-new-tag"
                                name="metadataNewTag"
                                aria-label="新增標籤"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onPaste={handleTagPaste}
                                placeholder={t("metadataDetails.tagInputPlaceholder")}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                                className="h-8"
                            />
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                            {newTagInput.trim() && !availableTags.find(t => t.name.toLowerCase() === newTagInput.trim().toLowerCase()) && (
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-accent"
                                    onClick={() => handleAddTag(newTagInput)}
                                >
                                    <span className="truncate">{t("metadataDetails.addQuoted").replace("{value}", newTagInput.trim())}</span>
                                    <Plus className="w-4 h-4 text-primary" />
                                </button>
                            )}
                            {availableTags
                                .filter(t => t.name.toLowerCase().includes(newTagInput.toLowerCase()))
                                .map(t => {
                                    const selected = currentTags.some(ct => ct.id === t.id);
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-accent ${
                                                selected ? "bg-accent/50" : ""
                                            }`}
                                            onClick={() => {
                                                if (selected) {
                                                    handleRemoveTag(t.id);
                                                } else {
                                                    handleAddTag(t.name);
                                                }
                                            }}
                                        >
                                            <span className="truncate">{t.name}</span>
                                            {selected ? (
                                                <Check className="w-4 h-4 text-primary" />
                                            ) : (
                                                <span className="w-4 h-4" />
                                            )}
                                        </button>
                                    );
                                })}
                            {availableTags.length === 0 && (
                                <div className="px-3 py-2 text-xs text-muted-foreground">{t("metadataDetails.noTags")}</div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid gap-2">
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

             <div className="grid gap-2">
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
        </div>
    );
}
