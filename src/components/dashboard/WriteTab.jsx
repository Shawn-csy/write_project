import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useWriteTab } from "../../hooks/useWriteTab";
import { ScriptToolbar } from "./write/ScriptToolbar";
import { ScriptList } from "./write/ScriptList";
import { CreateScriptDialog } from "./write/CreateScriptDialog";
import { RenameScriptDialog } from "./write/RenameScriptDialog";
import { ImportScriptDialog } from "./write/ImportScriptDialog";
import { DeleteScriptDialog } from "./write/DeleteScriptDialog";
import { MoveScriptDialog } from "./write/MoveScriptDialog";
import { createScript, updateScript, getScript, exportScripts } from "../../lib/db";
import { downloadBlob } from "../../lib/download";
import { Button } from "../ui/button";
import { FileText, Folder, Search, ArrowUpDown, FileStack, Globe, RotateCcw } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function WriteTab({ onSelectScript, readOnly = false, refreshTrigger }) {
    // Hooks
    const manager = useWriteTab(refreshTrigger, {
        onScriptCreated: onSelectScript
    });
    
    // Import Dialog State
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [previewItemId, setPreviewItemId] = useState(null);
    const [pageSize, setPageSize] = useState(50);
    const [page, setPage] = useState(1);
    const [sortKey, setSortKey] = useState("custom");
    const [sortDir, setSortDir] = useState("desc");
    const [filterType, setFilterType] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterQuery, setFilterQuery] = useState("");
    
    // Breadcrumbs Logic
    const breadcrumbs = useMemo(() => {
        const parts = manager.currentPath.split("/").filter(Boolean);
        let path = "";
        return parts.map(part => {
             path += "/" + part;
             return { name: part, path };  
        });
    }, [manager.currentPath]);

    const handleExport = async () => {
         if(!manager.currentUser) return;
         try {
             const blob = await exportScripts();
             downloadBlob(blob, "scripts_backup.zip");
         } catch(e) {
             console.error(e);
             alert("匯出失敗");
         }
    };

    // Handle import script
    const handleImport = useCallback(async ({ title, content, folder }) => {
        try {
            // 1. Create Script Shell
            const id = await createScript(title, 'script', folder || manager.currentPath);
            
            // 2. Update Content
            await updateScript(id, {
                content,
                isPublic: false
            });
            
            // 3. Refresh the script list
            manager.refresh?.();
            
            // 4. Return new script
            return await getScript(id);
        } catch (err) {
            console.error("匯入失敗:", err);
            throw err;
        }
    }, [manager]);

    const handleOpenScript = useCallback((script) => {
        if (typeof window !== "undefined") {
            try {
                window.sessionStorage.setItem(
                    "write_tab_return_state_v1",
                    JSON.stringify({
                        currentPath: manager.currentPath || "/",
                        expandedPaths: Array.from(manager.expandedPaths || []),
                    })
                );
            } catch (e) {
                console.warn("Failed to persist write tab return state", e);
            }
        }
        onSelectScript(script);
    }, [manager.currentPath, manager.expandedPaths, onSelectScript]);

    const previewItem = useMemo(
        () => manager.scripts.find((s) => s.id === previewItemId) || null,
        [manager.scripts, previewItemId]
    );

    const previewPath = useMemo(() => {
        if (!previewItem) return "/";
        const parent = previewItem.folder === "/" ? "" : previewItem.folder;
        return `${parent}/${previewItem.title}`;
    }, [previewItem]);

    const availableFolders = useMemo(() => {
        const folders = manager.scripts
            .filter((s) => s.type === "folder")
            .map((f) => ((f.folder === "/" ? "" : f.folder) + "/" + f.title));
        return ["/", ...Array.from(new Set(folders)).sort((a, b) => a.localeCompare(b))];
    }, [manager.scripts]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = window.localStorage.getItem("write_list_preferences_v1");
        if (!saved) return;
        try {
            const prefs = JSON.parse(saved);
            if (prefs.pageSize) setPageSize(Number(prefs.pageSize));
            if (prefs.sortKey) setSortKey(prefs.sortKey);
            if (prefs.sortDir) setSortDir(prefs.sortDir);
            if (prefs.filterType) setFilterType(prefs.filterType);
            if (prefs.filterStatus) setFilterStatus(prefs.filterStatus);
            if (typeof prefs.filterQuery === "string") setFilterQuery(prefs.filterQuery);
        } catch (e) {
            console.warn("Failed to parse list preferences", e);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(
            "write_list_preferences_v1",
            JSON.stringify({ pageSize, sortKey, sortDir, filterType, filterStatus, filterQuery })
        );
    }, [pageSize, sortKey, sortDir, filterType, filterStatus, filterQuery]);

    const filteredAndSortedItems = useMemo(() => {
        let items = manager.visibleItems;

        if (filterType !== "all") {
            items = items.filter((item) => item.type === filterType);
        }

        if (filterStatus !== "all") {
            const target = filterStatus === "public";
            items = items.filter((item) => item.type === "script" && Boolean(item.isPublic) === target);
        }

        if (filterQuery.trim()) {
            const q = filterQuery.trim().toLowerCase();
            items = items.filter((item) => {
                const title = String(item.title || "").toLowerCase();
                const path = String(item.folder || "/").toLowerCase();
                return title.includes(q) || path.includes(q);
            });
        }

        const sorted = [...items];
        if (sortKey === "title") {
            sorted.sort((a, b) => {
                const diff = String(a.title || "").localeCompare(String(b.title || ""), "zh-Hant");
                return sortDir === "asc" ? diff : -diff;
            });
        } else if (sortKey === "lastModified") {
            sorted.sort((a, b) => {
                const diff = (a.lastModified || a.createdAt || 0) - (b.lastModified || b.createdAt || 0);
                return sortDir === "asc" ? diff : -diff;
            });
        }
        return sorted;
    }, [manager.visibleItems, filterType, filterStatus, filterQuery, sortKey, sortDir]);
    
    const hasActiveFilters = filterType !== "all" || filterStatus !== "all" || Boolean(filterQuery.trim()) || sortKey !== "custom";

    const totalItems = filteredAndSortedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const pagedItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredAndSortedItems.slice(start, start + pageSize);
    }, [filteredAndSortedItems, page, pageSize]);

    useEffect(() => {
        setPage(1);
    }, [manager.currentPath, pageSize, sortKey, sortDir, filterType, filterStatus, filterQuery]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <ScriptToolbar 
                currentPath={manager.currentPath}
                breadcrumbs={breadcrumbs}
                onSelectScript={handleOpenScript}
                currentUser={manager.currentUser}
                readOnly={readOnly}
                goUp={manager.goUp}
                navigateTo={manager.navigateTo}
                onExport={handleExport}
                onImport={() => setIsImportOpen(true)}
                onCreateFolder={() => { manager.setNewType('folder'); manager.setIsCreateOpen(true); }}
                onCreateScript={() => { manager.setNewType('script'); manager.setIsCreateOpen(true); }}
            />

            {/* File Explorer */}
            <div className="flex-1 min-h-0 flex gap-3">
                <div className="border rounded-lg bg-card flex-1 min-h-0 overflow-y-auto">
                    <div className="px-4 py-2 border-b bg-muted/20 flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1" title="搜尋名稱或路徑">
                            <Search className="w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                className="h-7 w-48 rounded-md border border-input bg-background px-2 text-foreground"
                                placeholder="名稱或路徑..."
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                aria-label="搜尋名稱或路徑"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    title="排序設定"
                                    aria-label="排序設定"
                                >
                                    <ArrowUpDown className={`w-3.5 h-3.5 ${sortKey !== "custom" ? "text-foreground" : "text-muted-foreground"}`} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52">
                                <DropdownMenuLabel>排序欄位</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={sortKey} onValueChange={(val) => setSortKey(val)}>
                                    <DropdownMenuRadioItem value="custom">自訂排序</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="lastModified">修改時間</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="title">名稱</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>排序方向</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={sortDir}
                                    onValueChange={(val) => setSortDir(val)}
                                >
                                    <DropdownMenuRadioItem value="desc">由新到舊 / Z-A</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="asc">由舊到新 / A-Z</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex items-center gap-1" title="篩選類型">
                            <FileStack className="w-3.5 h-3.5 text-muted-foreground" />
                            <select
                                className="h-7 rounded-md border border-input bg-background px-2 text-foreground"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                aria-label="篩選類型"
                            >
                                <option value="all">全部</option>
                                <option value="script">文件</option>
                                <option value="folder">資料夾</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-1" title="篩選狀態">
                            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                            <select
                                className="h-7 rounded-md border border-input bg-background px-2 text-foreground"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                aria-label="篩選狀態"
                            >
                                <option value="all">全部</option>
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                            </select>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            disabled={!hasActiveFilters}
                            onClick={() => {
                                setFilterQuery("");
                                setFilterType("all");
                                setFilterStatus("all");
                                setSortKey("custom");
                                setSortDir("desc");
                            }}
                            title="清除篩選與排序"
                            aria-label="清除篩選與排序"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                    <ScriptList 
                        loading={manager.loading}
                        visibleItems={pagedItems}
                        readOnly={readOnly}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSortChange={(key) => {
                            if (key !== "title" && key !== "lastModified") return;
                            if (sortKey === key) {
                                setSortDir((d) => d === "asc" ? "desc" : "asc");
                            } else {
                                setSortKey(key);
                                setSortDir(key === "title" ? "asc" : "desc");
                            }
                        }}
                        currentPath={manager.currentPath}
                        expandedPaths={manager.expandedPaths}
                        activeDragId={manager.activeDragId}
                        markerThemes={manager.markerThemes}
                        sensors={manager.sensors}
                        
                        // Actions
                        onSelectScript={handleOpenScript}
                        onToggleExpand={manager.toggleExpand}
                        onRequestDelete={manager.openDeleteDialog}
                        onRequestMove={manager.openMoveDialog}
                        onTogglePublic={manager.handleTogglePublic}
                        onRename={manager.openRenameDialog}
                        onPreviewItem={(item) => setPreviewItemId(item.id)}
                        onGoUp={manager.goUp}
                        onDragStart={manager.handleDragStart}
                        onDragEnd={manager.handleDragEnd}
                        selectedPreviewId={previewItemId}
                        
                        // Setters
                        setScripts={manager.setScripts}
                    />
                </div>

                <aside className="hidden xl:flex xl:w-80 border rounded-lg bg-card p-4 flex-col gap-3">
                    <h3 className="text-sm font-semibold">檢視資訊</h3>
                    {!previewItem ? (
                        <p className="text-sm text-muted-foreground">單擊列表項目即可查看文件/資料夾詳情；文件可雙擊直接開啟。</p>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                {previewItem.type === "folder" ? (
                                    <Folder className="w-4 h-4 text-blue-500" />
                                ) : (
                                    <FileText className="w-4 h-4 text-blue-500" />
                                )}
                                <p className="font-medium truncate">{previewItem.title}</p>
                            </div>
                            <p className="text-xs text-muted-foreground break-all">路徑：{previewPath}</p>
                            <p className="text-xs text-muted-foreground">類型：{previewItem.type === "folder" ? "資料夾" : "文件"}</p>
                            {previewItem.type !== "folder" && (
                                <>
                                    <p className="text-xs text-muted-foreground">
                                        狀態：{previewItem.isPublic ? "Public" : "Private"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        字數（約）：{previewItem.contentLength ? Math.ceil(previewItem.contentLength / 2) : 0}
                                    </p>
                                </>
                            )}
                            {!readOnly && (
                                <div className="pt-2 flex flex-col gap-2">
                                    {previewItem.type !== "folder" && (
                                        <>
                                            <Button size="sm" onClick={() => handleOpenScript(previewItem)}>開啟文件</Button>
                                            <Button size="sm" variant="outline" onClick={() => manager.openMoveDialog(previewItem)}>移動到...</Button>
                                        </>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => manager.openRenameDialog(previewItem)}>重新命名</Button>
                                    <Button size="sm" variant="destructive" onClick={() => manager.openDeleteDialog(previewItem)}>刪除</Button>
                                </div>
                            )}
                        </>
                    )}
                </aside>
            </div>
            <div className="pt-3 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span>每頁</span>
                    <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-foreground"
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span>共 {totalItems} 筆</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                    >
                        上一頁
                    </Button>
                    <span>{page} / {totalPages}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                    >
                        下一頁
                    </Button>
                </div>
            </div>

            {/* Create Dialog */}
            <CreateScriptDialog 
                open={manager.isCreateOpen}
                onOpenChange={manager.setIsCreateOpen}
                newType={manager.newType}
                newTitle={manager.newTitle}
                setNewTitle={manager.setNewTitle}
                handleCreate={manager.handleCreate}
                creating={manager.creating}
                currentPath={manager.currentPath}
            />

            {/* Rename Dialog */}
            <RenameScriptDialog
                open={manager.isRenameOpen}
                onOpenChange={manager.setIsRenameOpen}
                type={manager.renameType}
                oldName={manager.oldRenameTitle} 
                newName={manager.renameTitle}
                setNewName={manager.setRenameTitle}
                handleRename={manager.handleRename}
                renaming={manager.renaming}
            />

            {/* Import Dialog */}
            <ImportScriptDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onImport={handleImport}
                currentPath={manager.currentPath}
                existingMarkerConfigs={[]}
                cloudConfigs={manager.markerThemes || []}
            />

            <DeleteScriptDialog
                open={manager.isDeleteOpen}
                onOpenChange={manager.setIsDeleteOpen}
                item={manager.deleteItem}
                scripts={manager.scripts}
                deleting={manager.deleting}
                onConfirm={manager.handleDeleteConfirm}
            />

            <MoveScriptDialog
                open={manager.isMoveOpen}
                onOpenChange={manager.setIsMoveOpen}
                item={manager.moveItem}
                availableFolders={availableFolders}
                targetFolder={manager.moveTargetFolder}
                setTargetFolder={manager.setMoveTargetFolder}
                moving={manager.moving}
                onConfirm={manager.handleMoveConfirm}
            />
        </div>
    );
}
