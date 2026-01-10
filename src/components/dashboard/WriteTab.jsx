import React, { useState, useEffect, useMemo } from "react";
import { 
    Loader2, 
    FileText, 
    Plus, 
    Trash2, 
    Folder, 
    ChevronRight, 
    Home, 
    Download, 
    FolderPlus, 
    ArrowLeft 
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import SearchBar from "./SearchBar";
import { FileRow, SortableFileRow } from "./FileRow";
import { useAuth } from "../../contexts/AuthContext";
import { 
    getUserScripts, 
    createScript, 
    updateScript, 
    deleteScript, 
    getScript 
} from "../../lib/db";
import { 
    DndContext, 
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import { 
    arrayMove, 
    SortableContext, 
    sortableKeyboardCoordinates, 
    verticalListSortingStrategy
} from '@dnd-kit/sortable';

// Helper to parse Fountain metadata
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

// Helper to fetch full content if needed before download
async function assureContent(item) {
    if (item.content !== undefined && item.content !== null) return item.content;
    try {
        const full = await getScript(item.id);
        return full.content || "";
    } catch (e) {
        console.error("Failed to fetch content", e);
        return "";
    }
}

export function WriteTab({ onSelectScript, readOnly = false }) {
    const { currentUser } = useAuth();
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState("/"); 
    
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState("script"); 
    const [creating, setCreating] = useState(false);
    const [activeDragId, setActiveDragId] = useState(null);

    const fetchScripts = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const data = await getUserScripts();
            setScripts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScripts();
    }, [currentUser]);

    const [expandedPaths, setExpandedPaths] = useState(new Set());

    const toggleExpand = (path, e) => {
        e?.stopPropagation();
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const visibleItems = useMemo(() => {
        const byFolder = {};
        scripts.forEach(s => {
            const f = s.folder || "/";
            if (!byFolder[f]) byFolder[f] = [];
            byFolder[f].push(s);
        });

        const sortFn = (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0);

        const buildFlat = (path, depth = 0) => {
            const items = byFolder[path] || [];
            items.sort(sortFn);
            let result = [];
            for (const item of items) {
                result.push({ ...item, depth });
                if (item.type === 'folder') {
                    const fullPath = (path === '/' ? '' : path) + '/' + item.title;
                    if (expandedPaths.has(fullPath)) {
                        result = [...result, ...buildFlat(fullPath, depth + 1)];
                    }
                }
            }
            return result;
        };

        return buildFlat(currentPath);
    }, [scripts, currentPath, expandedPaths]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event) => {
        setActiveDragId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (!over) return;

        const activeItem = scripts.find(s => s.id === active.id);
        const overItem = scripts.find(s => s.id === over.id);

        if (!activeItem || !overItem) return;

        // 1. Drag INTO Folder
        if (overItem.type === 'folder' && overItem.id !== activeItem.id && activeItem.folder !== ((overItem.folder === '/' ? '' : overItem.folder) + '/' + overItem.title)) {
             if (activeItem.folder === overItem.folder) {
                // Sibling folder, assume move in
             }
            
             if (activeItem.type !== 'folder') { 
                const newFolder = (overItem.folder === '/' ? '' : overItem.folder) + '/' + overItem.title;
                if (activeItem.folder !== newFolder) {
                     setScripts(prev => prev.map(s => s.id === active.id ? { ...s, folder: newFolder } : s));
                     try {
                        await updateScript(activeItem.id, { folder: newFolder });
                     } catch (e) { console.error(e); fetchScripts(); }
                     return;
                }
            }
        }

        // 2. Reorder / Move
        if (active.id !== over.id) {
            setScripts((items) => {
                const oldIndex = visibleItems.findIndex((item) => item.id === active.id);
                const newIndex = visibleItems.findIndex((item) => item.id === over.id);
                
                if (oldIndex === -1 || newIndex === -1) return items;

                const newVisible = arrayMove(visibleItems, oldIndex, newIndex);
                const movedItem = newVisible[newIndex];
                
                let newFolder = movedItem.folder;
                const prev = newVisible[newIndex - 1];

                if (prev) {
                    if (prev.type === 'folder' && expandedPaths.has((prev.folder === '/' ? '' : prev.folder) + '/' + prev.title)) {
                        newFolder = (prev.folder === '/' ? '' : prev.folder) + '/' + prev.title;
                    } else {
                        newFolder = prev.folder;
                    }
                } else {
                    newFolder = currentPath; 
                }

                movedItem.folder = newFolder;
                
                const siblings = newVisible.filter(i => i.folder === newFolder);
                const updates = siblings.map((item, idx) => ({
                    id: item.id,
                    sortOrder: idx * 1000.0,
                    folder: newFolder 
                }));
                
                const updateMap = new Map(updates.map(u => [u.id, u]));
                
                 if (movedItem.id === active.id) {
                     const originalFolder = scripts.find(s => s.id === active.id)?.folder;
                     if (originalFolder !== newFolder) {
                         updateScript(active.id, { folder: newFolder }).catch(console.error);
                     }
                 }
                 
                 fetch("/api/scripts/reorder", {
                     method: "PUT",
                     headers: { "Content-Type": "application/json", "X-User-ID": currentUser?.uid || "test-user" },
                     body: JSON.stringify(updates.map(({id, sortOrder}) => ({id, sortOrder})))
                 }).catch(console.error);

                 return items.map(s => {
                     if (s.id === active.id) return { ...s, folder: newFolder };
                     if (updateMap.has(s.id)) return { ...s, sortOrder: updateMap.get(s.id).sortOrder };
                     return s;
                 });
            });
        }
    };

    const handleTogglePublic = async (e, item) => {
        e.stopPropagation();
        const newStatus = !item.isPublic;
        if (item.type === 'folder' && !confirm(newStatus ? "確定要將此資料夾內所有內容設為公開嗎？" : "確定要將此資料夾內所有內容設為私有嗎？")) {
             return;
        }

        setScripts(prev => prev.map(s => {
             if (s.id === item.id) return { ...s, isPublic: newStatus };
             if (item.type === 'folder') {
                  const prefix = (item.folder === '/' ? '' : item.folder) + '/' + item.title;
                  if (s.folder === prefix || s.folder.startsWith(prefix + '/')) {
                       return { ...s, isPublic: newStatus };
                  }
             }
             return s;
        }));

        try {
            await updateScript(item.id, { isPublic: newStatus });
             if (item.type === 'folder') {
                  const prefix = (item.folder === '/' ? '' : item.folder) + '/' + item.title;
                  const children = scripts.filter(s => s.folder === prefix || s.folder.startsWith(prefix + '/'));
                  await Promise.all(children.map(c => updateScript(c.id, { isPublic: newStatus })));
             }
        } catch(err) {
            console.error(err);
             fetchScripts(); // Reload on error
        }
    };

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            await createScript(newTitle, newType, currentPath);
            if (newType === 'script') {
                 // Actually createScript returns ID but we refetch to be safe/consistent?
                 // Or we can just reload.
                 // Ideally we enter the script immediately. 
                 // But createScript in db.js returns ID.
                 // We will just reload list.
            } 
            setNewTitle("");
            setIsCreateOpen(false);
            fetchScripts();
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("確定要刪除嗎？")) return;
        try {
            await deleteScript(id);
            setScripts(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const formatDate = (ts) => new Date(ts).toLocaleDateString();

    const breadcrumbs = useMemo(() => {
        const parts = currentPath.split("/").filter(Boolean);
        let path = "";
        return parts.map(part => {
             path += "/" + part;
             return { name: part, path };  
        });
    }, [currentPath]);

    // URL Sync for Folder
    useEffect(() => {
        const getFolderFromUrl = () => {
            if (typeof window === "undefined") return "/";
            const params = new URLSearchParams(window.location.search);
            return params.get("folder") || "/";
        };
        setCurrentPath(getFolderFromUrl());

        const handlePopState = () => {
             setCurrentPath(getFolderFromUrl());
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const navigateTo = (path) => {
        setCurrentPath(path);
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (path === "/") url.searchParams.delete("folder");
            else url.searchParams.set("folder", path);
            window.history.pushState({}, "", url);
        }
    };
    
    const goUp = () => {
        const parts = currentPath.split("/").filter(Boolean);
        parts.pop();
        const parent = parts.length ? "/" + parts.join("/") : "/";
        navigateTo(parent);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 shrink-0 gap-2">
                 <div className="flex-1 max-w-sm flex items-center gap-2">
                     {currentPath !== "/" && (
                         <Button variant="ghost" size="icon" onClick={goUp} title="回上一層" className="shrink-0">
                             <ArrowLeft className="w-4 h-4" />
                         </Button>
                     )}
                     <SearchBar onSelectResult={onSelectScript} />
                 </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden px-2">
                    <button 
                        onClick={() => navigateTo("/")}
                        className={`flex items-center hover:text-foreground transition-colors ${currentPath === '/' ? 'text-foreground font-semibold' : ''}`}
                    >
                        <Home className="w-4 h-4 mr-1" />
                    </button>
                    {breadcrumbs.map((crumb, i) => (
                        <React.Fragment key={crumb.path}>
                            <ChevronRight className="w-3 h-3 opacity-50" />
                            <div 
                                onClick={() => navigateTo(crumb.path)}
                                className={`hover:text-foreground transition-colors truncate cursor-pointer ${i === breadcrumbs.length - 1 ? 'text-foreground font-semibold' : ''}`}
                            >
                                {crumb.name}
                            </div>
                        </React.Fragment>
                    ))}
                </div>

                {!readOnly && (
                <div className="flex items-center gap-1">
                     <Button size="icon" variant="ghost" onClick={async () => {
                         if(!currentUser) return;
                         try {
                              const res = await fetch("/api/export/all", {
                                  headers: { "X-User-ID": currentUser.uid }
                              });
                              if(!res.ok) throw new Error("Export failed");
                              const blob = await res.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = "scripts_backup.zip";
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                         } catch(e) {
                             console.error(e);
                             alert("匯出失敗");
                         }
                     }} title="全部匯出 (Backup)">
                        <Download className="w-4 h-4" />
                     </Button>
                     <div className="w-px h-4 bg-border/60 mx-1" />
                     <Button size="icon" variant="ghost" onClick={() => { setNewType('folder'); setIsCreateOpen(true); }} title="新增資料夾">
                        <FolderPlus className="w-4 h-4" />
                     </Button>
                     <Button size="icon" variant="ghost" onClick={() => { setNewType('script'); setIsCreateOpen(true); }} title="新增劇本">
                        <Plus className="w-4 h-4" />
                     </Button>
                </div>
                )}
            </div>

            {/* File List */}
            <div className="border rounded-lg bg-card flex-1 min-h-0 overflow-y-auto">
                 {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                 ) : visibleItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
                        <p>此資料夾為空</p>
                        {!readOnly && (
                        <Button variant="outline" size="sm" onClick={() => { setNewType('script'); setIsCreateOpen(true); }}>
                            <Plus className="w-4 h-4 mr-2" /> 建立第一個劇本
                        </Button>
                        )}
                    </div>
                 ) : (
                    <DndContext 
                        sensors={readOnly ? [] : sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
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
                                     <div className="w-10"></div>
                                 </div>

                                 {/* Go Up Option if not root */}
                                 {currentPath !== "/" && (
                                    <div 
                                        onClick={goUp}
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
                                                        toggleExpand(fullPath, e);
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
                                                     </>
                                                 )}
                                                    <div className="w-20 flex justify-center">
                                                        <div 
                                                            onClick={(e) => !readOnly && handleTogglePublic(e, item)}
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
                                                        // Download logic
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
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDelete(e, item.id)}>
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
                 )}
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{newType === 'folder' ? '建立新資料夾' : '建立新劇本'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            placeholder={newType === 'folder' ? "資料夾名稱" : "劇本標題"}
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            autoFocus
                        />
                         <p className="text-xs text-muted-foreground mt-2">
                            位置: {currentPath}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
                        <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                            {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            建立
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
