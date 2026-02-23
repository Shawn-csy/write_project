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
import { useI18n } from "../../contexts/I18nContext";

export function WriteTab({ onSelectScript, readOnly = false, refreshTrigger }) {
    const { t } = useI18n();
    // Hooks
    const manager = useWriteTab(refreshTrigger, {
        onScriptCreated: onSelectScript
    });
    
    // Import Dialog State
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [previewItemId, setPreviewItemId] = useState(null);
    const [pageSize, setPageSize] = useState(50);
    const [loadedCount, setLoadedCount] = useState(50);
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
             alert(t("writeTab.exportFailed"));
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
            console.error(t("writeTab.importFailedLog"), err);
            throw err;
        }
    }, [manager, t]);

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
    const pagedItems = useMemo(() => {
        return filteredAndSortedItems.slice(0, loadedCount);
    }, [filteredAndSortedItems, loadedCount]);
    const hasMoreItems = loadedCount < totalItems;

    useEffect(() => {
        setLoadedCount(pageSize);
    }, [manager.currentPath, pageSize, sortKey, sortDir, filterType, filterStatus, filterQuery]);

    const loadMore = useCallback(() => {
        setLoadedCount((prev) => Math.min(prev + pageSize, totalItems));
    }, [pageSize, totalItems]);

    const handleListScroll = useCallback((e) => {
        const el = e.currentTarget;
        const threshold = 80;
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
        if (nearBottom && hasMoreItems) {
            loadMore();
        }
    }, [hasMoreItems, loadMore]);

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
                <div
                    className="border rounded-lg bg-card flex-1 min-h-0 overflow-y-auto"
                    onScroll={handleListScroll}
                >
                    <div className="px-4 py-2 border-b bg-muted/20 flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1" title={t("writeTab.searchTitle")}>
                            <Search className="w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                className="h-7 w-48 rounded-md border border-input bg-background px-2 text-foreground"
                                placeholder={t("writeTab.searchPlaceholder")}
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                aria-label={t("writeTab.searchAria")}
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    title={t("writeTab.sortSettings")}
                                    aria-label={t("writeTab.sortSettings")}
                                >
                                    <ArrowUpDown className={`w-3.5 h-3.5 ${sortKey !== "custom" ? "text-foreground" : "text-muted-foreground"}`} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52">
                                <DropdownMenuLabel>{t("writeTab.sortField")}</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={sortKey} onValueChange={(val) => setSortKey(val)}>
                                    <DropdownMenuRadioItem value="custom">{t("writeTab.sortCustom")}</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="lastModified">{t("writeTab.sortLastModified")}</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="title">{t("writeTab.sortName")}</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>{t("writeTab.sortDirection")}</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={sortDir}
                                    onValueChange={(val) => setSortDir(val)}
                                >
                                    <DropdownMenuRadioItem value="desc">{t("writeTab.sortDesc")}</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="asc">{t("writeTab.sortAsc")}</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex items-center gap-1" title={t("writeTab.filterType")}>
                            <FileStack className="w-3.5 h-3.5 text-muted-foreground" />
                            <select
                                className="h-7 rounded-md border border-input bg-background px-2 text-foreground"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                aria-label={t("writeTab.filterType")}
                            >
                                <option value="all">{t("writeTab.all")}</option>
                                <option value="script">{t("writeTab.file")}</option>
                                <option value="folder">{t("writeTab.folder")}</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-1" title={t("writeTab.filterStatus")}>
                            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                            <select
                                className="h-7 rounded-md border border-input bg-background px-2 text-foreground"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                aria-label={t("writeTab.filterStatus")}
                            >
                                <option value="all">{t("writeTab.all")}</option>
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
                            title={t("writeTab.clearFiltersAndSorting")}
                            aria-label={t("writeTab.clearFiltersAndSorting")}
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
                    <h3 className="text-sm font-semibold">{t("writeTab.previewInfo")}</h3>
                    {!previewItem ? (
                        <p className="text-sm text-muted-foreground">{t("writeTab.previewHint")}</p>
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
                            <p className="text-xs text-muted-foreground break-all">{t("writeTab.pathLabel").replace("{path}", previewPath)}</p>
                            <p className="text-xs text-muted-foreground">{t("writeTab.typeLabel").replace("{type}", previewItem.type === "folder" ? t("writeTab.folder") : t("writeTab.file"))}</p>
                            {previewItem.type !== "folder" && (
                                <>
                                    <p className="text-xs text-muted-foreground">
                                        {t("writeTab.statusLabel").replace("{status}", previewItem.isPublic ? "Public" : "Private")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t("writeTab.charCountApprox").replace("{count}", String(previewItem.contentLength ? Math.ceil(previewItem.contentLength / 2) : 0))}
                                    </p>
                                </>
                            )}
                            {!readOnly && (
                                <div className="pt-2 flex flex-col gap-2">
                                    {previewItem.type !== "folder" && (
                                        <>
                                            <Button size="sm" onClick={() => handleOpenScript(previewItem)}>{t("writeTab.openFile")}</Button>
                                            <Button size="sm" variant="outline" onClick={() => manager.openMoveDialog(previewItem)}>{t("writeTab.moveTo")}</Button>
                                        </>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => manager.openRenameDialog(previewItem)}>{t("writeTab.rename")}</Button>
                                    <Button size="sm" variant="destructive" onClick={() => manager.openDeleteDialog(previewItem)}>{t("common.remove")}</Button>
                                </div>
                            )}
                        </>
                    )}
                </aside>
            </div>
            <div className="pt-3 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span>{t("writeTab.perPage")}</span>
                    <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-foreground"
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span>{t("writeTab.loadedCount").replace("{loaded}", String(pagedItems.length)).replace("{total}", String(totalItems))}</span>
                </div>
                {hasMoreItems ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMore}
                    >
                        {t("writeTab.loadMore")}
                    </Button>
                ) : (
                    <span>{t("writeTab.loadedAll")}</span>
                )}
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
