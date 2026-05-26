import React from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { SensorDescriptor, UniqueIdentifier } from "@dnd-kit/core";
import { SortableField } from "./SortableField";
import { SortableContactField } from "./SortableContactField";
import { useI18n } from "../../../contexts/I18nContext";
import { MetadataAuthorCoverCard } from "./MetadataAuthorCoverCard";
import { MetadataTagsCard } from "./MetadataTagsCard";

interface TagOption {
    id?: string | number;
    name?: string;
    color?: string;
}

interface ContactFieldItem {
    id?: string;
    key: string;
    value: string;
}

interface CustomFieldItem {
    id?: string;
    type?: string;
    key: string;
    value: string;
}

interface SeriesOption {
    id: string;
    name: string;
}

export interface MetadataDetailsTabProps {
    status: string;
    coverUrl: string | null;
    setCoverUrl: (value: string) => void;
    currentTags: TagOption[];
    author: string;
    setAuthor: (value: string) => void;
    availableTags: TagOption[];
    newTagInput: string;
    setNewTagInput: (value: string) => void;
    handleAddTag: (tagName?: string) => void;
    handleAddTagsBatch?: (tags: string[]) => void;
    handleRemoveTag: (tagId: string | number) => void;
    handleClearTags: () => void;
    contactFields: ContactFieldItem[];
    setContactFields: (value: ContactFieldItem[]) => void;
    onAddContactField: (preset?: string) => void;
    handleContactFieldUpdate: (id: string, key: string, value: string) => void;
    activeSensors: SensorDescriptor<object>[] | undefined;
    dragDisabled: boolean;
    setDragDisabled: (value: boolean) => void;
    customFields: CustomFieldItem[];
    setCustomFields: (value: CustomFieldItem[]) => void;
    addCustomField: (key?: string, value?: string) => void;
    addDivider: () => void;
    handleCustomFieldUpdate: (id: string, key: string, value: string) => void;
    requiredErrors?: Record<string, string | boolean | undefined>;
    recommendedErrors?: Record<string, string | boolean | undefined>;
    targetAudience: string;
    setTargetAudience: (value: string) => void;
    contentRating: string;
    setContentRating: (value: string) => void;
    seriesName: string;
    setSeriesName: (value: string) => void;
    seriesId: string | null;
    setSeriesId: (value: string | null) => void;
    seriesOptions?: SeriesOption[];
    quickSeriesName?: string;
    setQuickSeriesName?: (value: string) => void;
    onQuickCreateSeries?: () => void;
    isCreatingSeries?: boolean;
    seriesOrder?: string | number;
    setSeriesOrder?: (value: string | number) => void;
    showStatusAlert?: boolean;
    showAuthorCover?: boolean;
    showAudienceRating?: boolean;
    showSeries?: boolean;
    showTags?: boolean;
    showContact?: boolean;
    showCustom?: boolean;
    layout?: "stack" | "grid-2" | "grid-3";
}

export function MetadataDetailsTab({
    status,
    coverUrl, setCoverUrl,
    currentTags,
    author, setAuthor,
    availableTags,
    newTagInput, setNewTagInput,
    handleAddTag, handleAddTagsBatch,
    handleRemoveTag, handleClearTags,
    contactFields, setContactFields,
    onAddContactField, handleContactFieldUpdate,
    activeSensors,
    dragDisabled, setDragDisabled,
    customFields, setCustomFields,
    addCustomField, addDivider, handleCustomFieldUpdate,
    requiredErrors = {},
    recommendedErrors = {},
    targetAudience, setTargetAudience,
    contentRating, setContentRating,
    seriesName, setSeriesName,
    seriesId, setSeriesId,
    seriesOptions = [],
    quickSeriesName, setQuickSeriesName, onQuickCreateSeries,
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
}: MetadataDetailsTabProps): React.JSX.Element {
    const { t } = useI18n();

    const normalizedContactFields = React.useMemo(
        () => contactFields.map((field, index) => ({ ...field, id: field.id || `contact-${index}` })),
        [contactFields]
    );
    const normalizedCustomFields = React.useMemo(
        () => customFields.map((field, index) => ({ ...field, id: field.id || `custom-${index}` })),
        [customFields]
    );

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
                <div className="flex w-full items-start gap-3 rounded-lg border p-4 text-sm" style={{ borderColor: "var(--license-term-border)", backgroundColor: "var(--license-term-bg)", color: "var(--license-term-fg)" }}>
                    <AlertTriangle className="h-5 w-5 mt-0.5" />
                    <div className="grid gap-1">
                        <h5 className="font-medium leading-none tracking-tight">{t("metadataDetails.suggestionTitle")}</h5>
                        <div className="opacity-90 leading-relaxed">
                            {t("metadataDetails.suggestionText", "").replace("{cover}", !coverUrl ? ` ${t("metadataDetails.coverWord")}` : "").replace("{and}", !coverUrl && currentTags.length === 0 ? ` ${t("metadataDetails.andWord")}` : "").replace("{tags}", currentTags.length === 0 ? ` ${t("metadataDetails.tagsWord")}` : "")}
                        </div>
                    </div>
                </div>
            )}

            {showAuthorCover && (
                <MetadataAuthorCoverCard
                    author={author} setAuthor={setAuthor}
                    coverUrl={coverUrl} setCoverUrl={setCoverUrl}
                    recommendedErrors={recommendedErrors}
                    className={authorCoverSpan}
                />
            )}

            {/* Target Audience & Content Rating */}
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
                                {["男性向", "女性向", "全性向"].map(opt => (
                                    <Button key={`aud-${opt}`} type="button" variant="outline" size="sm"
                                        className={`h-8 px-3 text-xs font-medium transition ${targetAudience === opt ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
                                        onClick={() => setTargetAudience(opt)}
                                    >{opt}</Button>
                                ))}
                            </div>
                            {requiredErrors.audience && <p className="text-xs text-destructive">{t("metadataDetails.requiredTip", "發佈前必須選擇觀眾取向")}</p>}
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">內容分級</div>
                            <div className="inline-flex flex-wrap gap-1.5 rounded-md border bg-background p-1">
                                {["全年齡向", "成人向"].map(opt => (
                                    <Button key={`rating-${opt}`} type="button" variant="outline" size="sm"
                                        className={`h-8 px-3 text-xs font-medium transition ${contentRating === opt ? (opt === "成人向" ? "border-destructive bg-destructive text-destructive-foreground ring-2 ring-destructive/40" : "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40") : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
                                        onClick={() => setContentRating(opt)}
                                    >{opt}</Button>
                                ))}
                            </div>
                            {requiredErrors.rating && <p className="text-xs text-destructive">{t("metadataDetails.requiredTipRating", "發佈前必須選擇內容分級")}</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Series */}
            {showSeries && (
                <div className={`${cardClass} ${seriesSpan}`}>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor="metadata-series-name">{t("metadataDetails.seriesName", "系列名稱 (Series)")}</label>
                        <Select value={seriesId || "__none__"} onValueChange={value => { const nextId = value === "__none__" ? "" : value; setSeriesId(nextId); setSeriesName((seriesOptions || []).find(s => s.id === nextId)?.name || ""); }}>
                            <SelectTrigger id="metadata-series-name"><SelectValue placeholder={t("metadataDetails.seriesNamePlaceholder", "請選擇系列")} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">{t("metadataDetails.noSeries", "不加入系列")}</SelectItem>
                                {(seriesOptions || []).map(series => <SelectItem key={series.id} value={series.id}>{series.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {seriesName && <p className="text-xs text-muted-foreground">{t("metadataDetails.currentSeries", "目前系列")}：{seriesName}</p>}
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor="metadata-quick-series-name">{t("metadataDetails.quickCreateSeries", "快速新增系列")}</label>
                        <div className="flex items-center gap-2">
                            <Input id="metadata-quick-series-name" name="metadataQuickSeriesName" value={quickSeriesName} onChange={e => setQuickSeriesName?.(e.target.value)} placeholder={t("metadataDetails.quickCreateSeriesPlaceholder", "輸入新系列名稱")} onKeyDown={e => { if (e.nativeEvent.isComposing || e.key !== "Enter") return; e.preventDefault(); onQuickCreateSeries?.(); }} />
                            <Button type="button" variant="secondary" disabled={!String(quickSeriesName || "").trim() || isCreatingSeries} onClick={() => onQuickCreateSeries?.()}>
                                {isCreatingSeries ? t("common.saving", "建立中...") : t("common.create", "建立")}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{t("metadataDetails.quickCreateSeriesTip", "建立後會自動選取，可再到「系列管理」補上摘要與封面。")}</p>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor="metadata-series-order">{t("metadataDetails.seriesOrder", "系列順序 (第幾作)")}</label>
                        <Input id="metadata-series-order" name="metadataSeriesOrder" type="number" min="0" step="1" value={seriesOrder || ""} onChange={e => setSeriesOrder?.(e.target.value)} placeholder={t("metadataDetails.seriesOrderPlaceholder", "例如：0（設定集）或 1")} />
                        <p className="text-xs text-muted-foreground">{t("metadataDetails.seriesTip", "填入系列名稱後，公開閱讀頁會顯示同系列作品；0 可用於設定/背景篇。")}</p>
                    </div>
                </div>
            )}

            {showTags && (
                <MetadataTagsCard
                    currentTags={currentTags} availableTags={availableTags}
                    newTagInput={newTagInput} setNewTagInput={setNewTagInput}
                    handleAddTag={handleAddTag} handleAddTagsBatch={handleAddTagsBatch}
                    handleRemoveTag={handleRemoveTag} handleClearTags={handleClearTags}
                    recommendedErrors={recommendedErrors}
                    className={tagsSpan}
                />
            )}

            {/* Contact Fields */}
            {showContact && (
                <div className={`grid gap-2 rounded-xl border border-border/70 bg-background p-4 shadow-sm h-fit ${contactSpan}`}>
                    <label className="text-sm font-medium">{t("metadataDetails.contact")}</label>
                    <div className="flex flex-wrap gap-2">
                        {["Email", "手機", "Discord", "IG"].map(preset => (
                            <Button key={preset} type="button" variant="outline" size="sm" onClick={() => onAddContactField(preset)}>+ {preset}</Button>
                        ))}
                        <Button type="button" variant="ghost" size="sm" onClick={() => onAddContactField("")}>+ {t("common.add")}</Button>
                    </div>
                    <DndContext sensors={activeSensors} collisionDetection={closestCenter}
                        onDragEnd={({ active, over }: { active: { id: UniqueIdentifier }; over: { id: UniqueIdentifier } | null }) => {
                            if (!over || active.id === over.id) return;
                            const ids = normalizedContactFields.map(f => f.id);
                            setContactFields(arrayMove(normalizedContactFields, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
                        }}
                    >
                        <SortableContext items={normalizedContactFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {normalizedContactFields.map((field, idx) => (
                                    <SortableContactField key={field.id} field={field} index={idx} onUpdate={handleContactFieldUpdate} onRemove={(i: number) => setContactFields(normalizedContactFields.filter((_, fi) => fi !== i))} onFocus={() => setDragDisabled(true)} onBlur={() => setDragDisabled(false)} dragDisabled={dragDisabled} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                    <div className="text-xs text-muted-foreground">{t("metadataDetails.contactTip")}</div>
                </div>
            )}

            {/* Custom Fields */}
            {showCustom && (
                <div className={`grid gap-2 rounded-xl border border-border/70 bg-background p-4 shadow-sm h-fit ${customSpan}`}>
                    <label className="text-sm font-medium">{t("metadataDetails.custom")}</label>
                    <div className="flex flex-wrap gap-2">
                        {["角色設定", "世界觀", "備註"].map(preset => (
                            <Button key={preset} type="button" variant="outline" size="sm" onClick={() => addCustomField(preset, "")}>+ {preset}</Button>
                        ))}
                        <Button type="button" variant="ghost" size="sm" onClick={addDivider} className="text-xs">
                            <Badge variant="outline" className="mr-2 text-[10px] font-mono px-1 py-0 border-dashed">HR</Badge>
                            {t("metadataDetails.insertDivider")}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => addCustomField("", "")}>+ 新增</Button>
                    </div>
                    <DndContext sensors={activeSensors} collisionDetection={closestCenter}
                        onDragEnd={({ active, over }: { active: { id: UniqueIdentifier }; over: { id: UniqueIdentifier } | null }) => {
                            if (!over || active.id === over.id) return;
                            const ids = normalizedCustomFields.map(f => f.id);
                            setCustomFields(arrayMove(normalizedCustomFields, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
                        }}
                    >
                        <SortableContext items={normalizedCustomFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {normalizedCustomFields.map((field, idx) => (
                                    <SortableField key={field.id} field={field} index={idx} onUpdate={handleCustomFieldUpdate} onRemove={(i: number) => setCustomFields(normalizedCustomFields.filter((_, fi) => fi !== i))} onFocus={() => setDragDisabled(true)} onBlur={() => setDragDisabled(false)} dragDisabled={dragDisabled} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                    <div className="text-xs text-muted-foreground">這些欄位會寫入劇本標頭，可自由新增。</div>
                </div>
            )}
        </div>
    );
}
