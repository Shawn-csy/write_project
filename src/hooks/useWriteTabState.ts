import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useWriteTab } from "./useWriteTab";
import { createScript, updateScript, getScript } from "../lib/api/scripts";
import { parseImportTagNames, syncImportedTagsToScript } from "../lib/importPipeline/tagSync";
import { useI18n } from "../contexts/I18nContext";
import { useDebouncedSearch } from "./useDebouncedSearch";
import type { WriteScriptItem } from "../types/write";

interface Props {
  onSelectScript: (script: WriteScriptItem, mode?: string) => void;
  readOnly?: boolean;
  refreshTrigger?: number;
}

export function useWriteTabState({ onSelectScript, readOnly = false, refreshTrigger = 0 }: Props) {
  const { t } = useI18n();
  const manager = useWriteTab(refreshTrigger, { onScriptCreated: onSelectScript });

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const [loadedCount, setLoadedCount] = useState(50);
  const [sortKey, setSortKey] = useState("custom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterQuery, setFilterQuery] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const [guideSpotlightRect, setGuideSpotlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(true);
  const [footerQuote, setFooterQuote] = useState<{ quote?: string; anime?: string; character?: string } | null>(null);
  const [isQuickCreatingScript, setIsQuickCreatingScript] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [hasDesktopPreview, setHasDesktopPreview] = useState(false);

  const breadcrumbs = useMemo(() => {
    const parts = manager.currentPath.split("/").filter(Boolean);
    let path = "";
    return parts.map(part => { path += "/" + part; return { name: part, path }; });
  }, [manager.currentPath]);

  const footerTip = useMemo(() => {
    const tips = [t("scriptToolbar.tipOne"), t("scriptToolbar.tipTwo"), t("scriptToolbar.tipThree")].filter(Boolean);
    if (!tips.length) return "";
    const now = new Date();
    const seed = now.getFullYear() * 1000 + (now.getMonth() + 1) * 50 + now.getDate();
    return tips[seed % tips.length];
  }, [t]);

  const handleImport = useCallback(async ({ title, content, folder, metadata, customMetadata, author, draftDate }: {
    title: string; content: string; folder: string;
    metadata: Record<string, string>;
    customMetadata: Array<{ key: string; value: string; type: string }>;
    author: string; draftDate: string;
  }): Promise<void> => {
    try {
      const id = await createScript(title, "script", folder || manager.currentPath);
      await updateScript(id, { content, customMetadata: Array.isArray(customMetadata) ? customMetadata : [], author: String(author || "").trim(), draftDate: String(draftDate || "").trim(), isPublic: false });
      const importedTagNames = parseImportTagNames({ metadata, customMetadata });
      if (importedTagNames.length > 0) await syncImportedTagsToScript({ scriptId: id, tagNames: importedTagNames });
      const importedScript = await getScript(id);
      if (importedScript?.id) {
        manager.setScripts(prev => {
          const list = Array.isArray(prev) ? prev : [];
          const idx = list.findIndex(item => item.id === importedScript.id);
          if (idx >= 0) { const next = [...list]; next[idx] = { ...next[idx], ...importedScript }; return next; }
          return [...list, importedScript];
        });
      }
      await manager.fetchScripts?.();
    } catch (err) { console.error(t("writeTab.importFailedLog"), err); throw err; }
  }, [manager, t]);

  const handleOpenScript = useCallback((script: WriteScriptItem, targetMode = "read") => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("write_tab_return_state_v1", JSON.stringify({ currentPath: manager.currentPath || "/", expandedPaths: Array.from(manager.expandedPaths || []) }));
      } catch (e) { console.warn("Failed to persist write tab return state", e); }
    }
    onSelectScript(script, targetMode);
  }, [manager.currentPath, manager.expandedPaths, onSelectScript]);

  const handleQuickCreateScript = useCallback(async () => {
    if (readOnly || isQuickCreatingScript) return;
    const title = t("dashboard.untitledScript", "未命名劇本");
    const folder = manager.createPath || manager.currentPath || "/";
    setIsQuickCreatingScript(true);
    try {
      const id = await createScript(title, "script", folder);
      const createdScript = { id, title, type: "script" as const, folder, content: "", isPublic: false };
      manager.setScripts(prev => { const list = Array.isArray(prev) ? prev : []; return [...list, createdScript]; });
      manager.fetchScripts?.();
      handleOpenScript(createdScript, "edit");
    } catch (err) { console.error(t("publisher.createScriptFailed", "建立劇本失敗"), err); }
    finally { setIsQuickCreatingScript(false); }
  }, [handleOpenScript, isQuickCreatingScript, manager, readOnly, t]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleAction = (event: Event) => {
      const type = (event as CustomEvent<{ type?: string }>)?.detail?.type;
      if (type === "create-script") { handleQuickCreateScript(); return; }
      if (type === "create-folder") { manager.setNewType("folder"); manager.setIsCreateOpen(true); return; }
      if (type === "import-script") { setIsImportOpen(true); return; }
      if (type === "open-guide") { setGuideIndex(0); setShowGuide(true); }
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
        if (!Array.isArray(data) || !data.length) return;
        const sorted = [...data].filter((item: unknown) => Boolean(item) && typeof (item as { quote?: string }).quote === "string").sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
        if (sorted.length && !cancelled) setFooterQuote(sorted[Math.floor(Math.random() * sorted.length)]);
      } catch { /* keep fallback tip */ }
    };
    loadRandomQuote();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(min-width: 1280px)");
    const sync = () => setHasDesktopPreview(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const previewItem = useMemo(() => manager.scripts.find(s => s.id === previewItemId) || null, [manager.scripts, previewItemId]);

  const previewPath = useMemo(() => {
    if (!previewItem) return "/";
    const folder = previewItem.folder || "/";
    return `${folder === "/" ? "" : folder}/${previewItem.title}`;
  }, [previewItem]);

  const handlePreviewItemSelect = useCallback((item: WriteScriptItem, options: { openMobileDrawer?: boolean } = {}) => {
    if (!item?.id) return;
    setPreviewItemId(item.id);
    if (!hasDesktopPreview && (options.openMobileDrawer ?? true)) setIsMobilePreviewOpen(true);
  }, [hasDesktopPreview]);

  const availableFolders = useMemo(() => {
    const folders = manager.scripts.filter(s => s.type === "folder").map(f => ((f.folder === "/" ? "" : f.folder) + "/" + f.title));
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
    } catch (e) { console.warn("Failed to parse list preferences", e); }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined")
      window.localStorage.setItem("write_list_preferences_v1", JSON.stringify({ pageSize, sortKey, sortDir, filterQuery }));
  }, [pageSize, sortKey, sortDir, filterQuery]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("write_tab_preview_collapsed_v1");
    if (saved) setIsPreviewCollapsed(saved === "1");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined")
      window.localStorage.setItem("write_tab_preview_collapsed_v1", isPreviewCollapsed ? "1" : "0");
  }, [isPreviewCollapsed]);

  const debouncedFilterQuery = useDebouncedSearch(filterQuery, 200);

  const filteredAndSortedItems = useMemo(() => {
    let items = manager.visibleItems;
    if (debouncedFilterQuery.trim()) {
      const q = debouncedFilterQuery.trim().toLowerCase();
      items = items.filter(item => String(item.title || "").toLowerCase().includes(q) || String(item.folder || "/").toLowerCase().includes(q));
    }
    const sorted = [...items];
    if (sortKey === "title") sorted.sort((a, b) => { const d = String(a.title || "").localeCompare(String(b.title || ""), "zh-Hant"); return sortDir === "asc" ? d : -d; });
    else if (sortKey === "lastModified") sorted.sort((a, b) => { const d = (a.lastModified || a.createdAt || 0) - (b.lastModified || b.createdAt || 0); return sortDir === "asc" ? d : -d; });
    return sorted;
  }, [manager.visibleItems, debouncedFilterQuery, sortKey, sortDir]);

  const hasActiveFilters = Boolean(filterQuery.trim()) || sortKey !== "custom";
  const totalItems = filteredAndSortedItems.length;
  const pagedItems = useMemo(() => filteredAndSortedItems.slice(0, loadedCount), [filteredAndSortedItems, loadedCount]);
  const hasMoreItems = loadedCount < totalItems;

  useEffect(() => { setLoadedCount(pageSize); }, [manager.currentPath, pageSize, sortKey, sortDir, filterQuery]);

  const loadMore = useCallback(() => { setLoadedCount(prev => Math.min(prev + pageSize, totalItems)); }, [pageSize, totalItems]);

  const handleListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80 && hasMoreItems) loadMore();
  }, [hasMoreItems, loadMore]);

  const handleSortChange = useCallback((key: string) => {
    if (key !== "title" && key !== "lastModified") return;
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "title" ? "asc" : "desc"); }
  }, [sortKey]);

  const handleToggleExpandItem = useCallback((item: WriteScriptItem) => {
    const folder = item.folder || "/";
    manager.toggleExpand((folder === "/" ? "" : folder) + "/" + item.title);
  }, [manager.toggleExpand]);

  const guideSteps = useMemo(() => ([
    { title: t("writeTab.guideCreateTitle"), description: t("writeTab.guideCreateDesc"), target: "write-create-script-btn" },
    { title: t("writeTab.guideImportTitle"), description: t("writeTab.guideImportDesc"), target: "write-import-script-btn" },
    { title: t("writeTab.guideMiddleTitle"), description: totalItems === 0 ? t("writeTab.guideMiddleDescDemo") : t("writeTab.guideMiddleDesc"), target: "write-middle-controls" },
    { title: t("writeTab.guideListTitle"), description: t("writeTab.guideListDesc"), target: "write-list-panel" },
    { title: t("writeTab.guidePreviewTitle"), description: t("writeTab.guidePreviewDesc"), target: hasDesktopPreview ? "write-preview-panel" : "write-list-panel" },
  ]), [hasDesktopPreview, t, totalItems]);

  const getGuideTargetElement = useCallback((target: string) => {
    if (typeof document === "undefined") return null;
    return document.querySelector(`[data-guide-id="${target}"]`);
  }, []);

  const updateGuideSpotlight = useCallback(() => {
    if (!showGuide) { setGuideSpotlightRect(null); return; }
    const step = guideSteps[guideIndex];
    const element = step ? getGuideTargetElement(step.target) : null;
    if (!element) { setGuideSpotlightRect(null); return; }
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) { setGuideSpotlightRect(null); return; }
    const padding = 8;
    setGuideSpotlightRect({ top: Math.max(0, rect.top - padding), left: Math.max(0, rect.left - padding), width: rect.width + padding * 2, height: rect.height + padding * 2 });
  }, [getGuideTargetElement, guideIndex, guideSteps, showGuide]);

  useEffect(() => {
    if (!showGuide) return undefined;
    updateGuideSpotlight();
    window.addEventListener("resize", updateGuideSpotlight);
    window.addEventListener("scroll", updateGuideSpotlight, true);
    return () => { window.removeEventListener("resize", updateGuideSpotlight); window.removeEventListener("scroll", updateGuideSpotlight, true); };
  }, [guideIndex, showGuide, updateGuideSpotlight]);

  const closeGuide = useCallback(() => { setShowGuide(false); setGuideSpotlightRect(null); }, []);
  const prevGuide = useCallback(() => { setGuideIndex(prev => Math.max(0, prev - 1)); }, []);
  const nextGuide = useCallback(() => {
    if (guideIndex >= guideSteps.length - 1) { closeGuide(); return; }
    setGuideIndex(prev => Math.min(guideSteps.length - 1, prev + 1));
  }, [closeGuide, guideIndex, guideSteps.length]);

  return {
    t, manager, writeTone: null,
    isImportOpen, setIsImportOpen,
    previewItemId, pageSize, setPageSize,
    sortKey, setSortKey, sortDir, setSortDir,
    filterQuery, setFilterQuery,
    showGuide, setShowGuide, guideIndex, setGuideIndex, guideSpotlightRect,
    isPreviewCollapsed, setIsPreviewCollapsed,
    footerQuote, footerTip,
    isQuickCreatingScript, isMobilePreviewOpen, setIsMobilePreviewOpen,
    hasDesktopPreview, breadcrumbs,
    previewItem, previewPath, availableFolders,
    filteredAndSortedItems, hasActiveFilters, totalItems, pagedItems, hasMoreItems,
    guideSteps,
    handleImport, handleOpenScript, handleQuickCreateScript,
    handlePreviewItemSelect, handleListScroll, handleSortChange,
    handleToggleExpandItem, loadMore, closeGuide, prevGuide, nextGuide,
  };
}
