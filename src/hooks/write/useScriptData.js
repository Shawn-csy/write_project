import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getUserScripts } from "../../lib/db";

export function useScriptData() {
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

    // URL Sync
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

    // Derived State (Visible Items)
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
