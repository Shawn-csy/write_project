import React, { useMemo, useCallback, useState } from "react";
import { Loader2, Download, Trash2, Folder, ChevronRight, FileText, MoreHorizontal, Settings, Globe, FolderInput, ArrowUpDown } from "lucide-react";
import { Button } from "../../ui/button";
import { FileRow, SortableFileRow } from "../FileRow";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup, 
    DropdownMenuRadioItem
} from "../../ui/dropdown-menu";
import { 
    DndContext, 
    closestCenter,
    DragOverlay
} from '@dnd-kit/core';
import { 
    SortableContext, 
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { updateScript, getScript } from "../../../lib/db"; // Needed for inline theme update? or pass handler? 
// Passed handler is better but for now keep consistent with original logic mix

import { ScriptMetadataDialog } from "../../dashboard/ScriptMetadataDialog"; // Adjust path as needed
import { extractMetadata } from "../../../lib/metadataParser";
import { buildFilename, downloadText } from "../../../lib/download";

// Helper: assureContent
async function assureContent(item) {
    if (item.content !== undefined && item.content !== null) return item.content;
    try {
        // We need getScript but it's not imported. 
        // Ideally this logic should be in hook or passed down.
        // For refactoring speed, we will assume content is loaded or handle in parent.
        // Actually the original component imported getScript. 
        // Let's import it here for the download button.
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
    sortKey,
    sortDir,
    onSortChange,
    currentPath,
    expandedPaths,
    activeDragId,
    markerThemes,
    // Actions
    onSelectScript,
    onToggleExpand,
    onRequestDelete,
    onRequestMove,
    onTogglePublic,
    onRename, // Add this
    onPreviewItem,
    onGoUp,
    selectedPreviewId,
    
    // Drag Props
    sensors,
    onDragStart,
    onDragEnd,
    
    // State Setters (for local optimistic updates if needed, logic handled in hook basically)
    setScripts // Passed from hook if needed for inline theme update
}) {
    const [editingScriptId, setEditingScriptId] = useState(null);

    const dateFormatter = useMemo(() => new Intl.DateTimeFormat(undefined), []);
    const formatDate = useCallback((ts) => {
        if (!ts) return "";
        return dateFormatter.format(new Date(ts));
    }, [dateFormatter]);

    const markerThemeNameById = useMemo(() => {
        const map = {};
        (markerThemes || []).forEach((t) => {
            if (t?.id) map[t.id] = t.name || "主題";
        });
        return map;
    }, [markerThemes]);

    const enrichedItems = useMemo(() => {
        return (visibleItems || []).map((item) => {
            const metaData = item.content ? extractMetadata(item.content) : {};
            return {
                ...item,
                _displayDate: item.draftDate || metaData.date || metaData.draftdate || formatDate(item.lastModified || item.createdAt),
                _displayAuthor: item.author || metaData.author || metaData.authors || "User",
                _themeName: item.markerThemeId ? (markerThemeNameById[item.markerThemeId] || "主題") : "",
            };
        });
    }, [visibleItems, markerThemeNameById, formatDate]);

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

    const handleStatusClick = (e, item) => {
        if (readOnly) return;
        e.stopPropagation();
        setEditingScriptId(item.id);
    };

    const handleMetadataSave = (updatedScript) => {
        // Ideally we update the local list locally before waiting for refresh
        // But the dialog already calls API.
        // We can just trigger a refresh or let the parent handle it via onTogglePublic if it did refresh logic?
        // Actually, let's just update local state if we can.
        // setScripts(prev => prev.map(s => s.id === updatedScript.id ? { ...s, ...updatedScript } : s));
        // But setScripts is passed from props.
        if (setScripts) {
             setScripts(prev => prev.map(s => s.id === updatedScript.id ? { ...s, ...updatedScript, isPublic: updatedScript.status === 'Public' } : s));
        }
    };


    return (
        <>
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
                         <div className="flex-1">
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={() => onSortChange && onSortChange("title")}
                            >
                                名稱
                                <ArrowUpDown className={`w-3 h-3 ${sortKey === "title" ? "text-foreground" : "opacity-50"}`} />
                                {sortKey === "title" && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
                            </button>
                         </div>
                         <div className="w-24 text-right hidden sm:block">字數 (約)</div>
                         <div className="w-32 text-right hidden sm:block">
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={() => onSortChange && onSortChange("lastModified")}
                            >
                                修改日期
                                <ArrowUpDown className={`w-3 h-3 ${sortKey === "lastModified" ? "text-foreground" : "opacity-50"}`} />
                                {sortKey === "lastModified" && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
                            </button>
                         </div>
                         <div className="w-28 text-center hidden md:block">標記主題</div>
                         <div className="w-20 text-center hidden sm:block">狀態</div>
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
                     {enrichedItems.map((item) => {
                        const displayDate = item._displayDate;
                        const displayAuthor = item._displayAuthor;
                        const isSelected = selectedPreviewId === item.id;
                        const isChild = (item.depth || 0) > 0;
                        const rowClassName = isSelected
                            ? "bg-primary/12 ring-1 ring-inset ring-primary/45 border-l-4 border-l-primary"
                            : (isChild ? "bg-muted/20 border-l border-l-border/50" : "");

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
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground w-full flex-wrap">
                                            <span className="hidden sm:inline">{displayDate}</span>
                                            <span className="hidden sm:inline">·</span>
                                            <span className="truncate max-w-[100px] hidden sm:inline">{displayAuthor}</span>
                                            
                                            {/* Mobile: Show theme and public status */}
                                            <div className="flex items-center gap-1 sm:hidden">
                                                {item.markerThemeId && markerThemes && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-600 border border-blue-200">
                                                        {item._themeName || '主題'}
                                                    </span>
                                                )}
                                                <span 
                                                    onClick={(e) => handleStatusClick(e, item)}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] border ${item.isPublic ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-muted text-muted-foreground border-border'} ${!readOnly ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
                                                >
                                                    {item.isPublic ? 'Public' : 'Private'}
                                                </span>
                                            </div>
                                        </div>
                                        )
                                    }
                                    isFolder={item.type === 'folder'}
                                    tags={item.tags} 
                                    className={rowClassName}
                                    onClick={e => {
                                        if (item.type === 'folder') {
                                            const fullPath = (item.folder === '/' ? '' : item.folder) + '/' + item.title;
                                            onToggleExpand(fullPath, e);
                                            onPreviewItem && onPreviewItem(item);
                                        } else {
                                            onPreviewItem && onPreviewItem(item);
                                        }
                                    }}
                                    onDoubleClick={e => {
                                        if (item.type !== 'folder') {
                                            e.stopPropagation();
                                            onSelectScript(item);
                                        }
                                    }}
                                actions={
                                    <>

                                     {item.type !== 'folder' && (
                                         <>
                                            <div className="w-24 text-right text-xs text-muted-foreground hidden sm:block">
                                                {item.contentLength ? Math.ceil(item.contentLength / 2) : (item.content ? Math.ceil(item.content.length / 2) : 0)} 字
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
                                        {/* Theme Selector (Desktop Only) */}
                                        {item.type !== 'folder' && !readOnly && (
                                            <div className="w-28 text-center hidden md:block" onClick={e => e.stopPropagation()}>
                                                <select 
                                                    id={`script-theme-${item.id}`}
                                                    name={`scriptTheme-${item.id}`}
                                                    aria-label="劇本標記主題"
                                                    className="w-full h-6 text-[10px] rounded border border-input bg-background px-1"
                                                    value={item.markerThemeId || ""}
                                                    onChange={async (e) => {
                                                        const newVal = e.target.value;
                                                        try {
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
                                        
                                        {/* Public Status (Desktop Only or Icon) */}
                                        <div className="w-20 flex justify-center hidden sm:flex">
                                            {item.type !== 'folder' && (
                                                <div 
                                                    onClick={(e) => handleStatusClick(e, item)}
                                                    className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${!readOnly ? "cursor-pointer hover:opacity-80 active:scale-95 transition-all" : ""} ${item.isPublic ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-muted text-muted-foreground border-border'}`}
                                                    title={readOnly ? "" : "點擊管理發布設定"}
                                                >
                                                    {item.isPublic ? "Public" : "Private"}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions Dropdown (Replaces Hover Buttons) */}
                                        <div className="w-10 flex justify-end items-center" onClick={e => e.stopPropagation()}>
                                            {!readOnly && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>操作選項</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        
                                                        {item.type !== 'folder' && (
                                                            <DropdownMenuItem onClick={(e) => handleStatusClick(e, item) }>
                                                                <Globe className="w-4 h-4 mr-2" />
                                                                <span>發布設定...</span>
                                                            </DropdownMenuItem>
                                                        )}

                                                        {item.type !== 'folder' && (
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    <Settings className="w-4 h-4 mr-2" />
                                                                    <span>標記主題</span>
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent>
                                                                    <DropdownMenuRadioGroup 
                                                                        value={item.markerThemeId || ""} 
                                                                        onValueChange={async (val) => {
                                                                             try {
                                                                                const newVal = val === "__default__" ? "" : val;
                                                                                setScripts(prev => prev.map(s => s.id === item.id ? { ...s, markerThemeId: newVal } : s));
                                                                                await updateScript(item.id, { markerThemeId: newVal });
                                                                            } catch(err) {
                                                                                console.error("Theme update failed", err);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <DropdownMenuRadioItem value="__default__">
                                                                            (預設主題)
                                                                        </DropdownMenuRadioItem>
                                                                        {markerThemes.map(t => (
                                                                            <DropdownMenuRadioItem key={t.id} value={t.id}>
                                                                                {t.name}
                                                                            </DropdownMenuRadioItem>
                                                                        ))}
                                                                    </DropdownMenuRadioGroup>
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>
                                                        )}

                                                        <DropdownMenuSeparator />

                                                        {item.type !== 'folder' && (
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onRequestMove && onRequestMove(item);
                                                                }}
                                                            >
                                                                <FolderInput className="w-4 h-4 mr-2" />
                                                                <span>移動到...</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        
                                                        {item.type !== 'folder' && (
                                                            <DropdownMenuItem onClick={async () => {
                                                                const content = await assureContent(item);
                                                                const filename = buildFilename(item.title || "script", "fountain");
                                                                downloadText(content, filename);
                                                            }}>
                                                                <Download className="w-4 h-4 mr-2" />
                                                                <span>下載 .fountain</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        
                                                        <DropdownMenuItem 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // onRename should trigger dialog with item
                                                                onRename && onRename(item); 
                                                            }}
                                                        >
                                                            <div className="flex items-center">
                                                                <FileText className="w-4 h-4 mr-2" /> 
                                                                <span>重新命名</span>
                                                            </div>
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onRequestDelete && onRequestDelete(item);
                                                            }}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            <span>刪除</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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

        {/* Metadata Dialog */}
            <ScriptMetadataDialog 
                open={!!editingScriptId}
                onOpenChange={(open) => !open && setEditingScriptId(null)}
                scriptId={editingScriptId}
                onSave={handleMetadataSave}
            />
        </>
    );
}
