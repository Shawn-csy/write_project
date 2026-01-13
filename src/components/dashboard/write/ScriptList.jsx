import React from "react";
import { Loader2, Plus, Download, Trash2, Folder, ChevronRight, FileText } from "lucide-react";
import { Button } from "../../ui/button";
import { FileRow, SortableFileRow } from "../FileRow";
import { 
    DndContext, 
    closestCenter,
    DragOverlay
} from '@dnd-kit/core';
import { 
    SortableContext, 
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { updateScript } from "../../../lib/db"; // Needed for inline theme update? or pass handler? 
// Passed handler is better but for now keep consistent with original logic mix

// Helper to parse Fountain metadata (reused)
const extractMetadata = (content) => {
    if (!content) return {};
    const meta = {};
    const lines = content.split('\n');
    let readingMeta = true;
    for (let line of lines) {
        line = line.trim();
        if (!readingMeta) break;
        if (line === '') continue; 
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
            const key = match[1].toLowerCase().replace(' ', '');
            meta[key] = match[2];
        } else {
            readingMeta = false; 
        }
    }
    return meta;
};

// Helper: assureContent
async function assureContent(item) {
    if (item.content !== undefined && item.content !== null) return item.content;
    try {
        // We need getScript but it's not imported. 
        // Ideally this logic should be in hook or passed down.
        // For refactoring speed, we will assume content is loaded or handle in parent.
        // Actually the original component imported getScript. 
        // Let's import it here for the download button.
        const { getScript } = await import("../../../lib/db");
        const full = await getScript(item.id);
        return full.content || "";
    } catch (e) {
        console.error("Failed to fetch content", e);
        return "";
    }
}

export function ScriptList({
    loading,
    visibleItems,
    readOnly,
    currentPath,
    expandedPaths,
    activeDragId,
    markerThemes,
    // Actions
    onSelectScript,
    onToggleExpand,
    onDelete,
    onTogglePublic,
    onGoUp,
    
    // Drag Props
    sensors,
    onDragStart,
    onDragEnd,
    
    // State Setters (for local optimistic updates if needed, logic handled in hook basically)
    setScripts // Passed from hook if needed for inline theme update
}) {
    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }

    if (visibleItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
                <p>此資料夾為空</p>
            </div>
        );
    }

    const formatDate = (ts) => new Date(ts).toLocaleDateString();

    return (
        <DndContext 
            sensors={readOnly ? [] : sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <SortableContext 
                items={visibleItems.map(i => i.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex flex-col">
                     {/* Header Row */}
                     <div className="flex items-center px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                         <div className="flex-1">名稱</div>
                         <div className="w-24 text-right hidden sm:block">字數 (約)</div>
                         <div className="w-32 text-right hidden sm:block">修改日期</div>
                         <div className="w-20 text-center">狀態</div>
                         <div className="flex-1">名稱</div>
                         <div className="w-24 text-right hidden sm:block">字數 (約)</div>
                         <div className="w-32 text-right hidden sm:block">修改日期</div>
                         <div className="w-28 text-center hidden md:block">標記主題</div>
                         <div className="w-20 text-center">狀態</div>
                         <div className="w-10"></div>
                     </div>

                     {/* Go Up Option if not root */}
                     {currentPath !== "/" && (
                        <div 
                            onClick={onGoUp}
                            className="flex items-center px-4 py-3 hover:bg-muted/50 border-b border-border/40 cursor-pointer text-muted-foreground transition-colors"
                        >
                            <div className="mr-3 p-1">
                                <ChevronRight className="w-4 h-4 rotate-180" />
                            </div>
                            <span className="text-sm font-medium">.. (上一層)</span>
                        </div>
                     )}

                     {/* Items */}
                     {visibleItems.map((item) => {
                        const metaData = extractMetadata(item.content);
                        const displayDate = metaData.date || metaData.draftdate || new Date(item.lastModified || item.createdAt).toLocaleDateString();
                        const displayAuthor = metaData.author || metaData.authors || "Me";

                        return (
                        <SortableFileRow 
                            key={item.id} 
                            id={item.id}
                            item={item}
                            isFolder={item.type === 'folder'}
                        >
                                <FileRow
                                    style={{ marginLeft: `${(item.depth || 0) * 20}px` }}
                                    icon={item.type === 'folder' 
                                        ? <Folder className={`w-4 h-4 ${expandedPaths.has((item.folder === '/' ? '' : item.folder) + '/' + item.title) ? "fill-blue-500/20" : ""}`} /> 
                                        : <FileText className="w-4 h-4 text-blue-500" />
                                    }
                                    title={item.title || "Untitled"}
                                    meta={
                                        item.type === 'folder' ? null : (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                                            <span>{displayDate}</span>
                                            <span>·</span>
                                            <span className="truncate max-w-[100px]">{displayAuthor}</span>
                                        </div>
                                        )
                                    }
                                    isFolder={item.type === 'folder'}
                                    tags={item.tags} 
                                    onClick={e => {
                                        if (item.type === 'folder') {
                                            const fullPath = (item.folder === '/' ? '' : item.folder) + '/' + item.title;
                                            onToggleExpand(fullPath, e);
                                        } else {
                                            onSelectScript(item);
                                        }
                                    }}
                                actions={
                                    <>
                                     {item.type !== 'folder' && (
                                         <>
                                            <div className="w-24 text-right text-xs text-muted-foreground hidden sm:block">
                                                {item.content ? Math.ceil(item.content.length / 2) : 0} 字
                                            </div>
                                            <div className="w-32 text-right text-xs text-muted-foreground hidden sm:block">{formatDate(item.lastModified)}</div>
                                         </>
                                     )}
                                     {item.type === 'folder' && (
                                         <>
                                            <div className="w-24 hidden sm:block"></div>
                                            <div className="w-32 hidden sm:block"></div>
                                            <div className="w-28 hidden md:block"></div>
                                         </>
                                     )}
                                        {/* Theme Selector */}
                                        {item.type !== 'folder' && !readOnly && (
                                            <div className="w-28 text-center hidden md:block" onClick={e => e.stopPropagation()}>
                                                <select 
                                                    className="w-full h-6 text-[10px] rounded border border-input bg-background px-1"
                                                    value={item.markerThemeId || ""}
                                                    onChange={async (e) => {
                                                        const newVal = e.target.value;
                                                        try {
                                                            // Optimistic Update
                                                            setScripts(prev => prev.map(s => s.id === item.id ? { ...s, markerThemeId: newVal } : s));
                                                            await updateScript(item.id, { markerThemeId: newVal });
                                                        } catch(err) {
                                                            console.error("Theme update failed", err);
                                                        }
                                                    }}
                                                >
                                                    <option value="">(預設)</option>
                                                    {markerThemes.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className="w-20 flex justify-center">
                                            <div 
                                                onClick={(e) => !readOnly && onTogglePublic(e, item)}
                                                className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${!readOnly ? "cursor-pointer hover:opacity-80" : ""} ${item.isPublic ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-muted text-muted-foreground border-border'}`}
                                                title={readOnly ? "" : (item.type === 'folder' ? "設定資料夾所有內容為公開/私有" : "設定公開/私有")}
                                            >
                                                {item.isPublic ? "Public" : "Private"}
                                            </div>
                                        </div>
                                     <div className="w-10 flex justify-end flex items-center gap-1">
                                        {!readOnly && item.type !== 'folder' && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={async (e) => {
                                            e.stopPropagation();
                                            const content = await assureContent(item);
                                            const element = document.createElement("a");
                                            const file = new Blob([content], { type: "text/plain" });
                                            element.href = URL.createObjectURL(file);
                                            element.download = `${(item.title || "script").replace(/[^a-z0-9]/gi, '_').toLowerCase()}.fountain`;
                                            document.body.appendChild(element);
                                            element.click();
                                            document.body.removeChild(element);
                                        }} title="下載 (Export)">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                        )}
                                        {!readOnly && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => onDelete(e, item.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        )}
                                     </div>
                                    </>
                                }
                            />
                        </SortableFileRow>
                     );
                     })}
                </div>
            </SortableContext>
            <DragOverlay>
                 {activeDragId ? (
                    <div className="bg-background border rounded-md shadow-lg p-3 opacity-80">
                        Dragging...
                    </div>
                 ) : null}
            </DragOverlay>
        </DndContext>
    );
}
