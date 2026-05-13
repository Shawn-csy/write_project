import { useState, useEffect, useCallback, useMemo } from "react";
import type React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getUserScripts } from "../../lib/api/scripts";

interface ScriptItem {
    id: string;
    title: string;
    type?: string;
    folder: string;
    sortOrder?: number;
    lastModified?: number;
    createdAt?: number;
    [key: string]: unknown;
}

export function useScriptData(refreshTrigger = 0) {
    const { currentUser } = useAuth();
    const [scripts, setScripts] = useState<ScriptItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState("/");
    const [createPath, setCreatePath] = useState("/");
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

    const fetchScripts = useCallback(async () => {
        if (!currentUser) return;
        let cancelled = false;
        try {
            setLoading(true);
            const data = await getUserScripts(currentUser.uid);
            if (cancelled) return;
            if (!Array.isArray(data)) {
                setScripts([]);
                return;
            }
            // De-dupe folders with same path/title to avoid duplicate tree nodes
            const folderMap = new Map<string, ScriptItem>();
            const seenIds = new Set<string>();
            const deduped: ScriptItem[] = [];
            for (const item of data) {
                if (!item || !item.id) continue;
                if (seenIds.has(item.id)) continue;
                seenIds.add(item.id);
                if (item.type === "folder") {
                    const key = `${item.folder || "/"}::${item.title || ""}`;
                    const existing = folderMap.get(key);
                    if (!existing) {
                        folderMap.set(key, item);
                        deduped.push(item);
                    } else {
                        const existingScore = existing.lastModified || existing.createdAt || 0;
                        const itemScore = item.lastModified || item.createdAt || 0;
                        if (itemScore > existingScore) {
                            const idx = deduped.findIndex((s) => s.id === existing.id);
                            if (idx >= 0) deduped[idx] = item;
                            folderMap.set(key, item);
                        }
                    }
                } else {
                    deduped.push(item);
                }
            }
            if (!cancelled) setScripts(deduped);
        } catch (err) {
            if (!cancelled) console.error(err);
        } finally {
            if (!cancelled) setLoading(false);
        }
        return () => { cancelled = true; };
    }, [currentUser]);

    useEffect(() => {
        let cancelFn: (() => void) | undefined;
        fetchScripts().then((fn) => { cancelFn = fn; });
        return () => { cancelFn?.(); };
    }, [fetchScripts, refreshTrigger]);

    // URL Sync
    useEffect(() => {
        const getFolderFromUrl = () => {
            if (typeof window === "undefined") return "/";
            const params = new URLSearchParams(window.location.search);
            return params.get("folder") || "/";
        };
        let initialPath = getFolderFromUrl();

        if (typeof window !== "undefined") {
            try {
                const raw = window.sessionStorage.getItem("write_tab_return_state_v1");
                if (raw) {
                    const state = JSON.parse(raw);
                    if (state && typeof state.currentPath === "string") {
                        initialPath = state.currentPath || "/";
                    }
                    if (Array.isArray(state?.expandedPaths)) {
                        setExpandedPaths(new Set(state.expandedPaths));
                    }
                    window.sessionStorage.removeItem("write_tab_return_state_v1");
                }
            } catch (e: unknown) {
                console.warn("Failed to restore write tab return state", e);
            }
        }

        setCurrentPath(initialPath);
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (initialPath === "/") url.searchParams.delete("folder");
            else url.searchParams.set("folder", initialPath);
            window.history.replaceState({}, "", url);
        }

        const handlePopState = () => {
             setCurrentPath(getFolderFromUrl());
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const navigateTo = (path: string) => {
        setCurrentPath(path);
        setCreatePath(path);
        setExpandedPaths(new Set());
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

    // Derived State (Visible Items)
    // byFolder 只在 scripts 變動時重建，避免 path/expandedPaths 變動時重算整個 map
    const byFolder = useMemo(() => {
        const map: Record<string, ScriptItem[]> = {};
        for (const s of scripts) {
            const f = s.folder || "/";
            if (!map[f]) map[f] = [];
            map[f].push(s);
        }
        return map;
    }, [scripts]);

    const visibleItems = useMemo(() => {
        const sortFn = (a: ScriptItem, b: ScriptItem) => {
            const diff = (a.sortOrder || 0) - (b.sortOrder || 0);
            if (Math.abs(diff) > 0.01) return diff;
            return (b.lastModified || 0) - (a.lastModified || 0);
        };

        const buildFlat = (path: string, depth = 0): Array<ScriptItem & { depth: number }> => {
            const items = (byFolder[path] || []).slice().sort(sortFn);
            let result: Array<ScriptItem & { depth: number }> = [];
            for (const item of items) {
                result.push({ ...item, depth });
                if (item.type === 'folder') {
                    const fullPath = (path === '/' ? '' : path) + '/' + item.title;
                    if (expandedPaths.has(fullPath)) {
                        result = result.concat(buildFlat(fullPath, depth + 1));
                    }
                }
            }
            return result;
        };

        return buildFlat(currentPath);
    }, [byFolder, currentPath, expandedPaths]);

    const toggleExpand = (path: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const isExpanded = expandedPaths.has(path);
        if (isExpanded) {
            setExpandedPaths(prev => {
                const next = new Set(prev);
                next.delete(path);
                return next;
            });
            // Restore createPath to parent of collapsed folder
            const parts = path.split("/").filter(Boolean);
            parts.pop();
            setCreatePath(parts.length ? "/" + parts.join("/") : currentPath);
        } else {
            setExpandedPaths(prev => new Set([...prev, path]));
            setCreatePath(path);
        }
    };

    return {
        currentUser,
        scripts, setScripts,
        loading,
        currentPath,
        createPath,
        navigateTo, goUp,
        visibleItems,
        expandedPaths, setExpandedPaths, toggleExpand,
        fetchScripts
    };
}
