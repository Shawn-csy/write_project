import React, { useEffect, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "../../contexts/AuthContext";
import { getUserScripts, createScript, updateScript, deleteScript, getPublicScripts } from "../../lib/db";
import { Loader2, FileText, Plus, Globe, Lock, Trash2, Folder, FolderOpen, MoreVertical, ChevronRight, Home, Sparkles, MoreHorizontal, ChevronDown, FolderPlus, GripVertical, Download } from "lucide-react";
import { Switch } from "../ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import SearchBar from "./SearchBar";
import { Badge } from "../ui/badge";

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
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable File Row Wrapper
const SortableFileRow = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ 
        id: props.id,
        data: {
            type: props.isFolder ? 'folder' : 'script',
            item: props.item
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {React.isValidElement(props.children) 
                ? React.cloneElement(props.children, { dragListeners: listeners })
                : props.children
            }
        </div>
    );
};

import WelcomeLanding from "./WelcomeLanding";

export default function HybridDashboard({ 
    localFiles = [], 
    onSelectLocalFile, 
    onSelectCloudScript,
    onSelectPublicScript,
    enableLocalFiles = true,
    openSettings,
    openAbout
}) {
  const { currentUser, login } = useAuth();
  // Default to write if logged in, otherwise read
  const [activeTab, setActiveTab] = useState(currentUser ? "write" : "read");
  // Show landing page only if guest and not explicitly navigating
  const [showLanding, setShowLanding] = useState(!currentUser);

  useEffect(() => {
      if (currentUser) {
          setActiveTab("write");
          setShowLanding(false);
      } else {
          // If logging out, return to landing? Or stay on read?
          // Let's decide: Logout -> Landing.
          setShowLanding(true);
      }
  }, [currentUser]);

  if (activeTab === 'write' && !currentUser) {
      // If user tries to access write but is guest, show lock or redirect?
      // The tabs below handle the lock UI.
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
          {!currentUser && showLanding ? (
              <WelcomeLanding 
                  onBrowsePublic={() => {
                      setShowLanding(false); 
                      setActiveTab("read");
                  }}
                  onLoginRequest={login}
              />
          ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col justify-start">
                <div className="px-6 pt-4 shrink-0 flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="read" className="px-6">閱讀 (Read)</TabsTrigger>
                        <TabsTrigger value="write" className="px-6">創作 (Write)</TabsTrigger>
                    </TabsList>
                    
                    {/* Back to Landing (Guest only) */}
                    {!currentUser && (
                        <Button variant="ghost" size="sm" onClick={() => setShowLanding(true)}>
                            <Home className="w-4 h-4 mr-2" />
                            回首頁
                        </Button>
                    )}
                </div>

                <TabsContent value="read" className={`flex-1 min-h-0 overflow-hidden flex-col p-4 sm:p-6 mt-0 ${activeTab === 'read' ? 'flex' : 'hidden'}`}>
                    <ReadTab 
                        localFiles={localFiles} 
                        onSelectLocalFile={onSelectLocalFile}
                        onSelectPublicScript={onSelectPublicScript}
                        enableLocalFiles={enableLocalFiles}
                    />
                </TabsContent>

                <TabsContent value="write" className={`flex-1 min-h-0 overflow-hidden flex-col p-4 sm:p-6 mt-0 ${activeTab === 'write' ? 'flex' : 'hidden'}`}>
                    {currentUser ? (
                        <WriteTab onSelectScript={onSelectCloudScript} />
                    ) : (
                         /* Fallback Lock UI (Should be rare if we have Landing, but good for direct tab switch) */
                        <div className="flex flex-col items-center justify-center h-full text-center border-2 border-dashed rounded-xl m-4">
                            <Lock className="w-10 h-10 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">請先登入</h3>
                            <p className="text-muted-foreground mb-6 max-w-sm">
                                登入後即可開始創作、建立資料夾並管理您的雲端劇本。
                            </p>
                            <Button onClick={login}>登入 / 註冊</Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
          )}
      </div>
    </div>
  );
}

// Reuseable File Row Component
const FileRow = ({ icon, title, meta, actions, onClick, isFolder, tags = [], dragListeners, style }) => (
    <div 
        onClick={onClick}
        style={style}
        className="group flex items-center justify-between p-3 hover:bg-muted/50 border-b border-border/40 cursor-pointer transition-colors bg-card"
    >
        {/* Drag Handle */}
        {dragListeners && (
             <div 
                {...dragListeners}
                className="mr-2 text-muted-foreground/30 hover:text-foreground cursor-grab active:cursor-grabbing p-1"
                onClick={e => e.stopPropagation()}
            >
                <GripVertical className="w-4 h-4" />
            </div>
        )}

        <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-md ${isFolder ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'} group-hover:bg-primary/10 group-hover:text-primary transition-colors`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                <div className="font-medium truncate text-sm">{title}</div>
                <div className="flex items-center gap-2">
                    {tags && tags.length > 0 && (
                        <div className="flex gap-1">
                            {tags.map(tag => (
                                <Badge key={tag.id} className={`${tag.color} text-[10px] px-1 py-0 h-4 text-white`}>
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                    {meta && <div className="text-xs text-muted-foreground truncate opacity-70 font-mono">{meta}</div>}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {actions}
        </div>
    </div>
);

function ReadTab({ localFiles, onSelectLocalFile, onSelectPublicScript, enableLocalFiles }) {
    const [publicScripts, setPublicScripts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPublicScripts()
            .then(setPublicScripts)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const formatDate = (ts) => new Date(ts).toLocaleDateString();

    return (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
             {/* Local Files */}
            {enableLocalFiles && (
            <div className="flex-1 flex flex-col min-h-0">
                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 shrink-0">
                    <FolderOpen className="w-4 h-4" /> 本地檔案 (Local)
                </h3>
                <div className="border rounded-lg bg-card overflow-y-auto min-h-0 flex-1">
                     {localFiles.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">沒有本地檔案</p>
                    ) : (
                        localFiles.map(file => (
                            <FileRow 
                                key={file.path}
                                icon={<FileText className="w-4 h-4" />}
                                title={file.name}
                                meta={file.display}
                                onClick={() => onSelectLocalFile(file)}
                                actions={null}
                            />
                        ))
                    )}
                </div>
            </div>
            )}

            {/* Public Files */}
            <div className="flex-1 flex flex-col min-h-0">
                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 shrink-0">
                    <Globe className="w-4 h-4" /> 公開劇本 (Community)
                </h3>
                <div className="border rounded-lg bg-card overflow-y-auto min-h-0 flex-1">
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
                    ) : publicScripts.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">目前沒有公開劇本</p>
                    ) : (
                        publicScripts.map(script => (
                            <FileRow 
                                key={script.id}
                                icon={<Globe className="w-4 h-4" />}
                                title={script.title || "Untitled"}
                                meta={`Updated: ${formatDate(script.lastModified)}`}
                                onClick={() => onSelectPublicScript(script)}
                                actions={
                                    <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">Public</span>
                                }
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

import { reorderScripts } from "../../lib/db";

function WriteTab({ onSelectScript }) {
    const { currentUser } = useAuth();
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState("/"); // Virtual path, default root "/"
    
    // Modal States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState("script"); // script | folder
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

    // Expanded Folders State
    const [expandedPaths, setExpandedPaths] = useState(new Set());

    // Toggle Expand
    const toggleExpand = (path, e) => {
        e?.stopPropagation();
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    // Flatten scripts into tree list
    const visibleItems = useMemo(() => {
        // 1. Group by folder
        const byFolder = {};
        scripts.forEach(s => {
            const f = s.folder || "/";
            if (!byFolder[f]) byFolder[f] = [];
            byFolder[f].push(s);
        });

        // 2. Sort function
        const sortFn = (a, b) => {
             // Folders first? Or robust sortOrder
             // Mixed: sort by sortOrder
             return (a.sortOrder || 0) - (b.sortOrder || 0);
        };

        // 3. Recursive build
        const buildFlat = (path, depth = 0) => {
            const items = byFolder[path] || [];
            items.sort(sortFn);
            
            let result = [];
            for (const item of items) {
                // Add item with extra render props
                result.push({ ...item, depth });
                
                // If folder and expanded, add children
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
           // Logic to detect if we are hovering "over" the folder vs "sorting below" it
           // In Sortable, "over" means we are replacing its position.
           // But if we want to drop INTO, we usually need a specific target or check collision.
           // However, let's keep the previous logic: if over a folder, move into it.
           // BUT, we must prevent "moving into itself" or "moving into parent" if it's already there.
           // AND ensure we are not just reordering siblings.
           
           // If we are reordering siblings, active.folder === over.folder.
           if (activeItem.folder === overItem.folder) {
               // Reordering siblings... but wait, if 'over' is a folder sibling, do we move inside?
               // User wants "Drag into folder".
               // Let's assume if you drop ON a folder, you want to move in.
               // To reorder, you likely drop between items? `dnd-kit` sortable makes this hard to distinguish without strict collision detection.
               // Let's assume: If over folder AND type is folder, we move in. 
               // Unless we are holding a modifier key? No.
               
               // Let's stick to: If over folder, Move In. (User requested explicit support)
           }
           
            if (activeItem.type !== 'folder') { // Preventing folder-in-folder for now
                const newFolder = (overItem.folder === '/' ? '' : overItem.folder) + '/' + overItem.title;
                if (activeItem.folder !== newFolder) {
                    // Update
                     setScripts(prev => prev.map(s => s.id === active.id ? { ...s, folder: newFolder } : s));
                     try {
                        await updateScript(activeItem.id, { folder: newFolder });
                     } catch (e) { console.error(e); fetchScripts(); }
                     return;
                }
            }
        }

        // 2. Reorder / Move (Generic)
        if (active.id !== over.id) {
            setScripts((items) => {
                const oldIndex = visibleItems.findIndex((item) => item.id === active.id);
                const newIndex = visibleItems.findIndex((item) => item.id === over.id);
                
                if (oldIndex === -1 || newIndex === -1) return items;

                // 1. Calculate new visible order
                const newVisible = arrayMove(visibleItems, oldIndex, newIndex);
                const movedItem = newVisible[newIndex];
                
                // 2. Determine new folder based on context
                let newFolder = movedItem.folder;
                
                // Logic: Look at neighbors to decide folder
                // - If we have a predecessor (item above), we likely share its folder, UNLESS it's an expanded folder parent.
                const prev = newVisible[newIndex - 1];
                const next = newVisible[newIndex + 1];

                if (prev) {
                    if (prev.type === 'folder' && expandedPaths.has((prev.folder === '/' ? '' : prev.folder) + '/' + prev.title)) {
                        // Dropped immediately inside an expanded folder
                        newFolder = (prev.folder === '/' ? '' : prev.folder) + '/' + prev.title;
                    } else {
                        // Adopt predecessor's folder (sibling)
                        newFolder = prev.folder;
                    }
                } else {
                    // No prev: We are at the top of the list?
                    // Then likely Root, or top of the current view (which is Root based on currentPath logic)
                    // If currentPath is actually used as filter, we stick to currentPath.
                    // But in our flat build, the top item is in `currentPath`.
                    newFolder = currentPath; 
                }

                // 3. Update the item's folder locally
                movedItem.folder = newFolder;
                
                // 4. Update SortOrders for the TARGET folder's siblings
                // We need to re-calc sortOrder for all items in the newFolder to be safe/clean
                // Or just the relevant ones. 
                // Since 'newVisible' contains a mix of folders, we just need to grab the items belonging to 'newFolder'
                // and preserve their relative order in 'newVisible'.
                
                const siblings = newVisible.filter(i => i.folder === newFolder);
                const updates = siblings.map((item, idx) => ({
                    id: item.id,
                    sortOrder: idx * 1000.0,
                    folder: newFolder // Ensure folder update is sent
                }));
                
                // Trigger API
                const updateMap = new Map(updates.map(u => [u.id, u]));
                
                // API Call (Fire and forget-ish, using catch to revert if needed)
                // We need to send both folder and sortOrder updates
                // The /reorder endpoint only takes {id, sortOrder}. 
                // We might need to split this: Update folder for the moved item, then reorder?
                // Or update /reorder endpoint to accept folder?
                // For now, let's call updateScript for the folder change manually if needed, then reorder.
                
                // Actually, if folder changed, we MUST call updateScript first or concurrently.
                // Optimally: parallel updates.
                
                 if (movedItem.id === active.id) { // This check is redundant but safe
                     const originalFolder = scripts.find(s => s.id === active.id)?.folder;
                     if (originalFolder !== newFolder) {
                         updateScript(active.id, { folder: newFolder }).catch(console.error);
                     }
                 }
                 
                 // Batch reorder
                 fetch("/api/scripts/reorder", {
                     method: "PUT",
                     headers: { "Content-Type": "application/json", "X-User-ID": currentUser?.uid || "test-user" },
                     body: JSON.stringify(updates.map(({id, sortOrder}) => ({id, sortOrder})))
                 }).catch(console.error);

                 // Return full state
                 // We need to apply the changes to the full 'items' list
                 return items.map(s => {
                     if (s.id === active.id) return { ...s, folder: newFolder }; // Update folder logic
                     // Also update sortOrder for everyone in the updates list
                     if (updateMap.has(s.id)) return { ...s, sortOrder: updateMap.get(s.id).sortOrder };
                     return s;
                 });
            });
        }
    };

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            const id = await createScript(newTitle, newType, currentPath);
            if (newType === 'script') {
                  onSelectScript({ id, title: newTitle, content: "", folder: currentPath, type: 'script' });
            } else {
                 setNewTitle("");
                 setIsCreateOpen(false);
                 fetchScripts(); // Reload to show new folder
            }
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

    const handleTogglePublic = async (e, script) => {
        e.stopPropagation();
        const newVal = !script.isPublic;
        setScripts(prev => prev.map(s => s.id === script.id ? { ...s, isPublic: newVal ? 1 : 0 } : s));
        try {
            await updateScript(script.id, { isPublic: newVal });
        } catch (err) {
            console.error(err);
            fetchScripts();
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

    const navigateTo = (path) => setCurrentPath(path);
    const goUp = () => {
        const parts = currentPath.split("/").filter(Boolean);
        parts.pop();
        setCurrentPath(parts.length ? "/" + parts.join("/") : "/");
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 shrink-0 gap-2">
                 <div className="flex-1 max-w-sm">
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

                <div className="flex items-center gap-1">
                     <Button size="icon" variant="ghost" onClick={() => { setNewType('folder'); setIsCreateOpen(true); }} title="新增資料夾">
                        <FolderPlus className="w-4 h-4" />
                     </Button>
                     <Button size="icon" variant="ghost" onClick={() => { setNewType('script'); setIsCreateOpen(true); }} title="新增劇本">
                        <Plus className="w-4 h-4" />
                     </Button>
                </div>
            </div>

            {/* File List */}
            <div className="border rounded-lg bg-card flex-1 min-h-0 overflow-y-auto">
                 {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                 ) : visibleItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
                        <p>此資料夾為空</p>
                        <Button variant="outline" size="sm" onClick={() => { setNewType('script'); setIsCreateOpen(true); }}>
                            <Plus className="w-4 h-4 mr-2" /> 建立第一個劇本
                        </Button>
                    </div>
                 ) : (
                    <DndContext 
                        sensors={sensors}
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
                                 {visibleItems.map((item) => (
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
                                                    : <FileText className="w-4 h-4" />
                                                }
                                                title={item.title || "Untitled"}
                                                meta={null}
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
                                                        <div className="w-20 flex justify-center">
                                                            <div 
                                                                onClick={(e) => handleTogglePublic(e, item)}
                                                                className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border cursor-pointer hover:opacity-80 ${item.isPublic ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-muted text-muted-foreground border-border'}`}
                                                            >
                                                                {item.isPublic ? "Public" : "Private"}
                                                            </div>
                                                        </div>
                                                     </>
                                                 )}
                                                 {item.type === 'folder' && (
                                                     <>
                                                        <div className="w-24 text-right hidden sm:block"></div>
                                                        <div className="w-32 text-right text-xs text-muted-foreground hidden sm:block">{formatDate(item.createdAt || item.lastModified)}</div>
                                                        <div className="w-20"></div>
                                                     </>
                                                 )}
                                                 <div className="w-10 flex justify-end">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDelete(e, item.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                 </div>
                                                </>
                                            }
                                        />
                                    </SortableFileRow>
                                 ))}
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
