import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getUserScripts } from "../../lib/db";

export function useScriptData(refreshTrigger = 0) {
    const { currentUser } = useAuth();
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState("/");
    const [expandedPaths, setExpandedPaths] = useState(new Set());

    // Fetch Scripts
    const fetchScripts = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const data = await getUserScripts();
            if (!Array.isArray(data)) {
                setScripts([]);
                return;
            }
            // De-dupe folders with same path/title to avoid duplicate tree nodes
            const folderMap = new Map();
            const seenIds = new Set();
            const deduped = [];
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
                            const idx = deduped.findIndex(s => s.id === existing.id);
                            if (idx >= 0) deduped[idx] = item;
                            folderMap.set(key, item);
                        }
                    }
                } else {
                    deduped.push(item);
                }
            }
            setScripts(deduped);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScripts();
    }, [currentUser, refreshTrigger]);

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
            } catch (e) {
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

    // Derived State (Visible Items)
    const visibleItems = useMemo(() => {
        const byFolder = {};
        scripts.forEach(s => {
            const f = s.folder || "/";
            if (!byFolder[f]) byFolder[f] = [];
            byFolder[f].push(s);
        });

        const sortFn = (a, b) => {
            const diff = (a.sortOrder || 0) - (b.sortOrder || 0);
            if (Math.abs(diff) > 0.01) return diff;
            return (b.lastModified || 0) - (a.lastModified || 0);
        };

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

    const toggleExpand = (path, e) => {
        e?.stopPropagation();
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    return {
        currentUser,
        scripts, setScripts,
        loading,
        currentPath,
        navigateTo, goUp,
        visibleItems,
        expandedPaths, setExpandedPaths, toggleExpand,
        fetchScripts
    };
}
