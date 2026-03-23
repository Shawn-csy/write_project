import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useWriteTab } from "../../hooks/useWriteTab";
import { ScriptToolbar } from "./write/ScriptToolbar";
import { ScriptList } from "./write/ScriptList";
import { CreateScriptDialog } from "./write/CreateScriptDialog";
import { RenameScriptDialog } from "./write/RenameScriptDialog";
import { ImportScriptDialog } from "./write/ImportScriptDialog";
import { DeleteScriptDialog } from "./write/DeleteScriptDialog";
import { MoveScriptDialog } from "./write/MoveScriptDialog";
import { createScript, updateScript, getScript } from "../../lib/api/scripts";
import { parseImportTagNames, syncImportedTagsToScript } from "../../lib/importPipeline/tagSync";
import { Button } from "../ui/button";
import { Search, ArrowUpDown, RotateCcw, PanelRightOpen, PanelRightClose } from "lucide-react";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "../ui/drawer";
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
import { SpotlightGuideOverlay } from "../common/SpotlightGuideOverlay";
import { WritePreviewContent } from "./write/WritePreviewPanel";
import { MORANDI_STUDIO_TONE_VARS } from "../../constants/morandiPanelTones";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";

export function WriteTab({ onSelectScript, readOnly = false, refreshTrigger }) {
    const { t } = useI18n();
    const writeTone = MORANDI_STUDIO_TONE_VARS.works;
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
    const [filterQuery, setFilterQuery] = useState("");
    const [showGuide, setShowGuide] = useState(false);
    const [guideIndex, setGuideIndex] = useState(0);
    const [guideSpotlightRect, setGuideSpotlightRect] = useState(null);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(true);
    const [footerQuote, setFooterQuote] = useState(null);
    const [isQuickCreatingScript, setIsQuickCreatingScript] = useState(false);
    const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
    const [hasDesktopPreview, setHasDesktopPreview] = useState(false);
    
    // Breadcrumbs Logic
    const breadcrumbs = useMemo(() => {
        const parts = manager.currentPath.split("/").filter(Boolean);
        let path = "";
        return parts.map(part => {
             path += "/" + part;
             return { name: part, path };  
        });
    }, [manager.currentPath]);

    const footerTip = useMemo(() => {
        const tips = [
            t("scriptToolbar.tipOne"),
            t("scriptToolbar.tipTwo"),
            t("scriptToolbar.tipThree"),
        ].filter(Boolean);
        if (tips.length === 0) return "";
        const now = new Date();
        const seed = now.getFullYear() * 1000 + (now.getMonth() + 1) * 50 + now.getDate();
        return tips[seed % tips.length];
    }, [t]);

    // Handle import script
    const handleImport = useCallback(async ({ title, content, folder, metadata, customMetadata, author, draftDate }) => {
        try {
            // 1. Create Script Shell
            const id = await createScript(title, 'script', folder || manager.currentPath);
            
            // 2. Update Content
            await updateScript(id, {
                content,
                customMetadata: Array.isArray(customMetadata) ? customMetadata : [],
                author: String(author || "").trim(),
                draftDate: String(draftDate || "").trim(),
                isPublic: false
            });

            // 2.1 Sync parsed import tags into real script tags
            const importedTagNames = parseImportTagNames({
                metadata,
                customMetadata,
            });
            if (importedTagNames.length > 0) {
                await syncImportedTagsToScript({
                    scriptId: id,
                    tagNames: importedTagNames,
                });
            }

            // 3. Load newly created script and optimistically inject into list
            const importedScript = await getScript(id);
            if (importedScript?.id) {
                manager.setScripts((prev) => {
                    const list = Array.isArray(prev) ? prev : [];
                    const idx = list.findIndex((item) => item.id === importedScript.id);
                    if (idx >= 0) {
                        const next = [...list];
                        next[idx] = { ...next[idx], ...importedScript };
                        return next;
                    }
                    return [...list, importedScript];
                });
            }

            // 4. Ensure remote state is synchronized
            await manager.fetchScripts?.();

            // 5. Return new script
            return importedScript;
        } catch (err) {
            console.error(t("writeTab.importFailedLog"), err);
            throw err;
        }
    }, [manager, t]);

    const handleOpenScript = useCallback((script, targetMode = "read") => {
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
        onSelectScript(script, targetMode);
    }, [manager.currentPath, manager.expandedPaths, onSelectScript]);

    const handleQuickCreateScript = useCallback(async () => {
        if (readOnly || isQuickCreatingScript) return;
        const title = t("dashboard.untitledScript", "未命名劇本");
        const folder = manager.currentPath || "/";
        setIsQuickCreatingScript(true);
        try {
            const id = await createScript(title, "script", folder);
            let createdScript = {
                id,
                title,
                type: "script",
                folder,
                content: "",
                isPublic: false,
            };
            try {
                const fromServer = await getScript(id);
                if (fromServer?.id) {
                    createdScript = { ...createdScript, ...fromServer };
                }
            } catch (err) {
                console.warn("Failed to fetch newly created script", err);
            }

            manager.setScripts((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                const idx = list.findIndex((item) => item.id === createdScript.id);
                if (idx >= 0) {
                    const next = [...list];
                    next[idx] = { ...next[idx], ...createdScript };
                    return next;
                }
                return [...list, createdScript];
            });
            await manager.fetchScripts?.();
            handleOpenScript(createdScript, "edit");
        } catch (err) {
            console.error(t("publisher.createScriptFailed", "建立劇本失敗"), err);
        } finally {
            setIsQuickCreatingScript(false);
        }
    }, [handleOpenScript, isQuickCreatingScript, manager, readOnly, t]);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const handleAction = (event) => {
            const type = event?.detail?.type;
            if (type === "create-script") {
                handleQuickCreateScript();
                return;
            }
            if (type === "create-folder") {
                manager.setNewType("folder");
                manager.setIsCreateOpen(true);
                return;
            }
            if (type === "import-script") {
                setIsImportOpen(true);
                return;
            }
            if (type === "open-guide") {
                setGuideIndex(0);
                setShowGuide(true);
            }
        };
        window.addEventListener("write-tab-action", handleAction);
        return () => window.removeEventListener("write-tab-action", handleAction);
    }, [handleQuickCreateScript, manager]);

    useEffect(() => {
        let cancelled = false;
        const loadRandomQuote = async () => {
            try {
                const res = await fetch("/random_text.json", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (!Array.isArray(data) || data.length === 0) return;
                const sorted = [...data]
                    .filter((item) => item && typeof item.quote === "string")
                    .sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
                if (sorted.length === 0 || cancelled) return;
                const picked = sorted[Math.floor(Math.random() * sorted.length)];
                if (!cancelled) setFooterQuote(picked);
            } catch {
                // keep fallback tip
            }
        };
        loadRandomQuote();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const media = window.matchMedia("(min-width: 1280px)");
        const sync = () => setHasDesktopPreview(media.matches);
        sync();
        media.addEventListener("change", sync);
        return () => media.removeEventListener("change", sync);
    }, []);

    const previewItem = useMemo(
        () => manager.scripts.find((s) => s.id === previewItemId) || null,
        [manager.scripts, previewItemId]
    );

    const previewPath = useMemo(() => {
        if (!previewItem) return "/";
        const parent = previewItem.folder === "/" ? "" : previewItem.folder;
        return `${parent}/${previewItem.title}`;
    }, [previewItem]);

    const handlePreviewItemSelect = useCallback((item, options = {}) => {
        if (!item?.id) return;
        const { openMobileDrawer = true } = options;
        setPreviewItemId(item.id);
        if (!hasDesktopPreview && openMobileDrawer) {
            setIsMobilePreviewOpen(true);
        }
    }, [hasDesktopPreview]);

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
            if (typeof prefs.filterQuery === "string") setFilterQuery(prefs.filterQuery);
        } catch (e) {
            console.warn("Failed to parse list preferences", e);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(
            "write_list_preferences_v1",
            JSON.stringify({ pageSize, sortKey, sortDir, filterQuery })
        );
    }, [pageSize, sortKey, sortDir, filterQuery]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = window.localStorage.getItem("write_tab_preview_collapsed_v1");
        if (!saved) return;
        setIsPreviewCollapsed(saved === "1");
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("write_tab_preview_collapsed_v1", isPreviewCollapsed ? "1" : "0");
    }, [isPreviewCollapsed]);

    const debouncedFilterQuery = useDebouncedSearch(filterQuery, 200);

    const filteredAndSortedItems = useMemo(() => {
        let items = manager.visibleItems;

        if (debouncedFilterQuery.trim()) {
            const q = debouncedFilterQuery.trim().toLowerCase();
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
    }, [manager.visibleItems, debouncedFilterQuery, sortKey, sortDir]);
    
    const hasActiveFilters = Boolean(filterQuery.trim()) || sortKey !== "custom";
    const controlClassName = "h-8 rounded-md border border-[color:var(--morandi-tone-panel-border)] bg-background/90 text-foreground";
    const totalItems = filteredAndSortedItems.length;
    const pagedItems = useMemo(() => {
        return filteredAndSortedItems.slice(0, loadedCount);
    }, [filteredAndSortedItems, loadedCount]);
    const hasMoreItems = loadedCount < totalItems;

    useEffect(() => {
        setLoadedCount(pageSize);
    }, [manager.currentPath, pageSize, sortKey, sortDir, filterQuery]);

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

    const handleSortChange = useCallback((key) => {
        if (key !== "title" && key !== "lastModified") return;
        if (sortKey === key) {
            setSortDir((d) => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir(key === "title" ? "asc" : "desc");
        }
    }, [sortKey]);

    const handleToggleExpandItem = useCallback((item) => {
        const fullPath = (item.folder === "/" ? "" : item.folder) + "/" + item.title;
        manager.toggleExpand(fullPath);
    }, [manager.toggleExpand]);

    const guideSteps = useMemo(() => ([
        {
            title: t("writeTab.guideCreateTitle"),
            description: t("writeTab.guideCreateDesc"),
            target: "write-create-script-btn",
        },
        {
            title: t("writeTab.guideImportTitle"),
            description: t("writeTab.guideImportDesc"),
            target: "write-import-script-btn",
        },
        {
            title: t("writeTab.guideMiddleTitle"),
            description: totalItems === 0 ? t("writeTab.guideMiddleDescDemo") : t("writeTab.guideMiddleDesc"),
            target: "write-middle-controls",
        },
        {
            title: t("writeTab.guideListTitle"),
            description: t("writeTab.guideListDesc"),
            target: "write-list-panel",
        },
        {
            title: t("writeTab.guidePreviewTitle"),
            description: t("writeTab.guidePreviewDesc"),
            target: hasDesktopPreview ? "write-preview-panel" : "write-list-panel",
        },
    ]), [hasDesktopPreview, t, totalItems]);

    const getGuideTargetElement = useCallback((target) => {
        if (typeof document === "undefined") return null;
        return document.querySelector(`[data-guide-id="${target}"]`);
    }, []);

    const updateGuideSpotlight = useCallback(() => {
        if (!showGuide) {
            setGuideSpotlightRect(null);
            return;
        }
        const step = guideSteps[guideIndex];
        const element = step ? getGuideTargetElement(step.target) : null;
        if (!element) {
            setGuideSpotlightRect(null);
            return;
        }
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            setGuideSpotlightRect(null);
            return;
        }
        const padding = 8;
        setGuideSpotlightRect({
            top: Math.max(0, rect.top - padding),
            left: Math.max(0, rect.left - padding),
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
        });
    }, [getGuideTargetElement, guideIndex, guideSteps, showGuide]);

    useEffect(() => {
        if (!showGuide) return undefined;
        updateGuideSpotlight();
        const onLayoutChange = () => updateGuideSpotlight();
        window.addEventListener("resize", onLayoutChange);
        window.addEventListener("scroll", onLayoutChange, true);
        return () => {
            window.removeEventListener("resize", onLayoutChange);
            window.removeEventListener("scroll", onLayoutChange, true);
        };
    }, [guideIndex, showGuide, updateGuideSpotlight]);

    const closeGuide = useCallback(() => {
        setShowGuide(false);
        setGuideSpotlightRect(null);
    }, []);

    const prevGuide = useCallback(() => {
        setGuideIndex((prev) => Math.max(0, prev - 1));
    }, []);

    const nextGuide = useCallback(() => {
        if (guideIndex >= guideSteps.length - 1) {
            closeGuide();
            return;
        }
        setGuideIndex((prev) => Math.min(guideSteps.length - 1, prev + 1));
    }, [closeGuide, guideIndex, guideSteps.length]);

    return (
        <div className="flex h-full flex-col gap-3 overflow-hidden">
            {manager.currentPath !== "/" ? (
                <div
                    style={writeTone}
                    className="rounded-lg border border-[color:var(--morandi-tone-panel-border)] bg-gradient-to-r from-[var(--morandi-tone-helper-bg)] via-card to-card px-3 py-2 sm:px-4"
                >
                    <ScriptToolbar
                        currentPath={manager.currentPath}
                        breadcrumbs={breadcrumbs}
                        goUp={manager.goUp}
                        navigateTo={manager.navigateTo}
                    />
                </div>
            ) : null}

            <div className={`flex-1 min-h-0 grid grid-cols-1 gap-3 ${isPreviewCollapsed ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_22rem]"}`}>
                <section
                    style={writeTone}
                    className="min-h-0 flex flex-col overflow-hidden rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] shadow-sm"
                    data-guide-id="write-list-panel"
                >
                    <div
                        className="border-b bg-gradient-to-r from-[var(--morandi-tone-helper-bg)]/80 via-[var(--morandi-tone-helper-bg)]/35 to-transparent px-4 py-3 text-xs"
                        data-guide-id="write-middle-controls"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold tracking-tight text-[color:var(--morandi-tone-helper-fg)]">
                                {t("writeTab.listTitle", "檔案清單")}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <div className="flex w-48 sm:min-w-[220px] sm:flex-1 items-center gap-1 shrink-0" title={t("writeTab.searchTitle")}>
                                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    className={`${controlClassName} w-full px-2`}
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
                                        variant="outline"
                                        className={`${controlClassName} shrink-0 px-2`}
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
                            <Button
                                size="sm"
                                variant="outline"
                                className={`${controlClassName} shrink-0 px-2`}
                                disabled={!hasActiveFilters}
                                onClick={() => {
                                    setFilterQuery("");
                                    setSortKey("custom");
                                    setSortDir("desc");
                                }}
                                title={t("writeTab.clearFiltersAndSorting")}
                                aria-label={t("writeTab.clearFiltersAndSorting")}
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                            <div className="hidden xl:flex items-center gap-1 shrink-0 sm:ml-auto">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2"
                                    onClick={() => setIsPreviewCollapsed((prev) => !prev)}
                                    title={isPreviewCollapsed ? t("writeTab.showPreviewPanel") : t("writeTab.hidePreviewPanel")}
                                    aria-label={isPreviewCollapsed ? t("writeTab.showPreviewPanel") : t("writeTab.hidePreviewPanel")}
                                >
                                    {isPreviewCollapsed ? <PanelRightOpen className="w-3.5 h-3.5" /> : <PanelRightClose className="w-3.5 h-3.5" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto bg-[hsl(var(--surface-1))]/35 px-2 py-2" onScroll={handleListScroll}>
                        {showGuide && totalItems === 0 ? (
                            <div className="m-4 rounded-lg border border-dashed border-[color:var(--morandi-tone-helper-border)] bg-[color:var(--morandi-tone-helper-bg)]/45 p-4">
                                <h4 className="text-sm font-semibold text-[color:var(--morandi-tone-helper-fg)]">{t("writeTab.guideDemoTitle")}</h4>
                                <p className="mt-1 text-xs text-muted-foreground">{t("writeTab.guideDemoDesc")}</p>
                            </div>
                        ) : null}
                        <ScriptList
                            loading={manager.loading}
                            visibleItems={pagedItems}
                            readOnly={readOnly}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSortChange={handleSortChange}
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
                            onPreviewItem={handlePreviewItemSelect}
                            onGoUp={manager.goUp}
                            onDragStart={manager.handleDragStart}
                            onDragEnd={manager.handleDragEnd}
                            selectedPreviewId={previewItemId}

                            // Setters
                            setScripts={manager.setScripts}
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-[color:var(--morandi-tone-helper-bg)]/55 px-4 py-2 text-sm text-muted-foreground">
                        {hasMoreItems ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadMore}
                            >
                                {t("writeTab.loadMore")}
                            </Button>
                        ) : null}
                    </div>
                </section>

                <aside
                    style={writeTone}
                    className={`${isPreviewCollapsed ? "hidden" : "hidden xl:flex"} flex-col gap-3 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-gradient-to-b from-[var(--morandi-tone-helper-bg)]/45 to-card p-4`}
                    data-guide-id="write-preview-panel"
                >
                    <h3 className="text-sm font-semibold text-[color:var(--morandi-tone-helper-fg)]">{t("writeTab.previewInfo")}</h3>
                    <WritePreviewContent
                        previewItem={previewItem}
                        previewPath={previewPath}
                        readOnly={readOnly}
                        onOpen={handleOpenScript}
                        onMove={manager.openMoveDialog}
                        onRename={manager.openRenameDialog}
                        onDelete={manager.openDeleteDialog}
                        onToggleExpand={handleToggleExpandItem}
                    />
                </aside>
            </div>

            <Drawer open={isMobilePreviewOpen && !hasDesktopPreview} onOpenChange={setIsMobilePreviewOpen}>
                <DrawerContent side="bottom" className="max-h-[88dvh]">
                    <DrawerHeader className="border-b border-border/50">
                        <DrawerTitle>{t("writeTab.previewInfo", "項目資訊")}</DrawerTitle>
                        <DrawerDescription>
                            {previewItem?.title || t("writeTab.previewHint", "選取檔案後可查看資訊")}
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="overflow-y-auto px-4 pb-6 pt-3">
                        <WritePreviewContent
                            previewItem={previewItem}
                            previewPath={previewPath}
                            readOnly={readOnly}
                            onOpen={handleOpenScript}
                            onMove={manager.openMoveDialog}
                            onRename={manager.openRenameDialog}
                            onDelete={manager.openDeleteDialog}
                            onToggleExpand={(item) => {
                                const fullPath = (item.folder === "/" ? "" : item.folder) + "/" + item.title;
                                manager.toggleExpand(fullPath);
                            }}
                            onClose={() => setIsMobilePreviewOpen(false)}
                        />
                    </div>
                </DrawerContent>
            </Drawer>

            <footer
                style={writeTone}
                className="hidden md:block shrink-0 rounded-lg border border-[color:var(--morandi-tone-panel-border)] bg-gradient-to-r from-[var(--morandi-tone-helper-bg)]/50 via-card to-card px-3 py-2 text-xs text-muted-foreground"
                title={footerQuote ? `${footerQuote.anime || "-"}-${footerQuote.character || "-"}` : undefined}
            >
                <p className="truncate">{footerQuote?.quote || footerTip}</p>
            </footer>

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

            <SpotlightGuideOverlay
                open={showGuide}
                spotlightRect={guideSpotlightRect}
                currentStep={guideIndex + 1}
                totalSteps={guideSteps.length}
                title={guideSteps[guideIndex]?.title || ""}
                description={guideSteps[guideIndex]?.description || ""}
                onSkip={closeGuide}
                skipLabel={t("writeTab.guideSkip")}
                onPrev={prevGuide}
                prevLabel={t("writeTab.guidePrev")}
                prevDisabled={guideIndex === 0}
                onNext={nextGuide}
                nextLabel={guideIndex === guideSteps.length - 1 ? t("writeTab.guideDone") : t("writeTab.guideNext")}
            />
        </div>
    );
}
