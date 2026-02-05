import React from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { AlertTriangle, X, Plus } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableField } from "./SortableField";
import { SortableContactField } from "./SortableContactField";

export function MetadataDetailsTab({
    status,
    coverUrl, setCoverUrl,
    currentTags,
    author, setAuthor,
    availableTags,
    newTagInput, setNewTagInput,
    handleAddTag,
    handleRemoveTag,
    contactFields, setContactFields,
    onAddContactField,
    handleContactFieldUpdate,
    activeSensors,
    dragDisabled, setDragDisabled,
    customFields, setCustomFields,
    addCustomField,
    addDivider,
    handleCustomFieldUpdate
}) {
    return (
        <div className="space-y-6 mt-0">
            {/* Status Alert */}
            {status === "Public" && (!coverUrl || currentTags.length === 0) && (
                <div className="flex w-full items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="grid gap-1">
                        <h5 className="font-medium text-yellow-900 leading-none tracking-tight">建議補充資訊</h5>
                        <div className="text-yellow-700 opacity-90 leading-relaxed">
                            建議補充
                            {!coverUrl && " 封面"}
                            {!coverUrl && currentTags.length === 0 && " 與"}
                            {currentTags.length === 0 && " 標籤"}
                            以增加曝光。
                        </div>
                    </div>
                </div>
            )}
            <div className="grid gap-4 p-4 border rounded-lg bg-muted/20">
                <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="metadata-author">作者名稱 (Author Text)</label>
                    <Input id="metadata-author" name="metadataAuthor" value={author} onChange={e => setAuthor(e.target.value)} placeholder="覆蓋顯示的作者名稱..." />
                    <div className="text-xs text-muted-foreground">若留空則顯示發布身分的名稱。此欄位會寫入劇本標頭。</div>
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="metadata-cover-url">封面圖片 URL (Cover)</label>
                    <Input id="metadata-cover-url" name="metadataCoverUrl" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." />
                </div>
            </div>

             {/* Tags */}
            <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="metadata-new-tag">標籤 (Tags)</label>
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
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            id="metadata-new-tag"
                            name="metadataNewTag"
                            aria-label="新增標籤"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            placeholder="新增標籤..."
                            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                        />
                        {newTagInput && (
                            <div className="absolute top-full left-0 right-0 z-10 bg-popover border rounded-md shadow-md mt-1 max-h-40 overflow-y-auto">
                                {availableTags
                                    .filter(t => t.name.toLowerCase().includes(newTagInput.toLowerCase()) && !currentTags.find(ct => ct.id === t.id))
                                    .map(t => (
                                        <div 
                                            key={t.id}
                                            className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                            onClick={() => {
                                                setNewTagInput(t.name);
                                            }}
                                        >
                                            {t.name}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                    <Button type="button" variant="secondary" onClick={handleAddTag}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="grid gap-2">
                <label className="text-sm font-medium">聯絡方式 (Contact)</label>
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
                        + 新增
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
                <div className="text-xs text-muted-foreground">可自行新增欄位，例如 Email、手機、Discord。</div>
            </div>

             <div className="grid gap-2">
                <label className="text-sm font-medium">自訂欄位</label>
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
                         插入分隔線
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
