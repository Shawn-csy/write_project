import React, { useEffect, useState } from "react";
import { 
    Loader2, 
    Globe, 
    Folder,
    Search,
    RotateCcw
} from "lucide-react";
import { getPublicScripts } from "../../lib/db";
import { FileRow } from "./FileRow";
import { useI18n } from "../../contexts/I18nContext";
import { Button } from "../ui/button";

export function ReadTab({ onSelectPublicScript }) {
    const { t } = useI18n();
    const [publicScripts, setPublicScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedPublic, setExpandedPublic] = useState(new Set()); 
    const [publicCache, setPublicCache] = useState({}); 
    const [filterQuery, setFilterQuery] = useState("");



    useEffect(() => {
        getPublicScripts()
            .then(setPublicScripts)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const formatDate = (ts) => new Date(ts).toLocaleDateString();

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const expandTarget = params.get("public_expand");
        if (expandTarget) {
            // Format: ownerId:path/to/folder
            // e.g.  user123:/Folder/SubFolder
            
            const parts = expandTarget.split(":");
            if (parts.length < 2) return;
            const ownerId = parts[0];
            const fullPath = parts.slice(1).join(":"); // Rejoin just in case path has colons (unlikely but safe)
            
            // We need to expand:
            // 1. ownerId:/Folder
            // 2. ownerId:/Folder/SubFolder
            
            const pathParts = fullPath.split("/").filter(Boolean);
            let currentPath = "";
            const keysToExpand = new Set();
            
            // We must perform sequential expansion to ensure data is fetched
            const expandRecursive = async () => {
                try {
                    for (const part of pathParts) {
                        currentPath += "/" + part;
                        const key = `${ownerId}:${currentPath}`;
                        
                        setExpandedPublic(prev => {
                            const next = new Set(prev);
                            next.add(key);
                            return next;
                        });
                        keysToExpand.add(key);

                        if (!publicCache[key]) {
                            // Fetch data if missing
                             const children = await getPublicScripts(ownerId, currentPath);
                             setPublicCache(prev => ({ ...prev, [key]: children }));
                        }
                    }
                    
                    // Cleanup URL param after expansion to avoid re-triggering on reload if user navigates away?
                    // Or keep it? Standard practice is often to consume it.
                    // Let's clear it to be clean.
                    const url = new URL(window.location.href);
                    url.searchParams.delete("public_expand");
                    window.history.replaceState({}, "", url);
                    
                } catch (e) {
                    console.error("Failed to auto-expand public folder", e);
                }
            };
            
            expandRecursive();
        }
    }, []); // Run once on mount; avoid re-triggering expansion for every cache update.
    // Actually, if we depend on publicCache, we might infinite loop if we are not careful.
    // It's better to just run on mount (empty deps) or when location changes if we controlled it via props.
    // Since this component might remount when tab changes, [] is fine if we assume the URL param is present when tab is switched.


    const togglePublicExpand = async (e, item) => {
        e.stopPropagation();
        const fullPath = (item.folder === '/' ? '' : item.folder) + '/' + item.title;
        // Use composite key since ownerId matters in public feed
        const key = `${item.ownerId}:${fullPath}`;
        
        const next = new Set(expandedPublic);
        if (next.has(key)) {
            next.delete(key);
            setExpandedPublic(next);
        } else {
            next.add(key);
            setExpandedPublic(next);
            if (!publicCache[key]) {
                 try {
                    const children = await getPublicScripts(item.ownerId, fullPath);
                    setPublicCache(prev => ({ ...prev, [key]: children }));
                 } catch(err) {
                     console.error(err);
                 }
            }
        }
    };

    const filterTree = (items, queryLower) => {
        if (!queryLower) return items;
        const next = [];
        for (const item of items || []) {
            const fullPath = (item.folder === "/" ? "" : item.folder) + "/" + item.title;
            const key = `${item.ownerId}:${fullPath}`;
            const children = publicCache[key] || [];
            const filteredChildren = item.type === "folder" ? filterTree(children, queryLower) : [];
            const matchesSelf = String(item.title || "").toLowerCase().includes(queryLower);
            if (matchesSelf || filteredChildren.length > 0) {
                next.push({ ...item, _filteredChildren: filteredChildren });
            }
        }
        return next;
    };

    const query = filterQuery.trim().toLowerCase();
    const visiblePublicScripts = query ? filterTree(publicScripts, query) : publicScripts;

    const renderPublicItems = (items, level = 0) => {
        if (!items) return null;
        return items.map(script => {
             const fullPath = (script.folder === '/' ? '' : script.folder) + '/' + script.title;
             const key = `${script.ownerId}:${fullPath}`;
             const isExpanded = query ? true : expandedPublic.has(key);
             const isFolder = script.type === 'folder';
             const childrenForRender = query ? (script._filteredChildren || []) : (publicCache[key] || null);

             return (
                 <React.Fragment key={script.id}>
                    <FileRow 
                        // Use paddingLeft to indent content while keeping hover full width
                        style={{ paddingLeft: `${16 + (level * 20)}px` }}
                        isFolder={isFolder}
                        icon={isFolder ? <Folder className={`w-4 h-4 ${isExpanded ? "fill-blue-500/20" : ""}`} /> : <Globe className="w-4 h-4" />}
                        title={script.title || t("readTab.untitled")}
                        meta={isFolder ? null : `${t("readTab.updated")}: ${formatDate(script.lastModified)}`}
                        onClick={(e) => {
                             if (isFolder) {
                                 togglePublicExpand(e, script);
                             } else {
                                 onSelectPublicScript(script);
                             }
                        }}
                        actions={
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">{t("readTab.publicBadge")}</span>
                            </div>
                        }
                    />
                    {isFolder && isExpanded && (
                        childrenForRender ? renderPublicItems(childrenForRender, level + 1) : <div className="pl-8 py-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin"/> {t("readTab.loading")}</div>
                    )}
                 </React.Fragment>
             );
        });
    };

    return (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
             {/* Local Files */}


            {/* Public Files */}
            <div className="flex-1 flex flex-col min-h-0">
                 <div className="flex items-center justify-between mb-2 shrink-0">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Globe className="w-4 h-4" /> {t("readTab.publicScripts")}
                    </h3>
                 </div>
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs">
                    <div className="flex min-w-[220px] flex-1 items-center gap-1">
                        <Search className="w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-foreground"
                            placeholder="搜尋公開台本 / 資料夾"
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                        />
                    </div>
                    <span className="rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                        結果 {visiblePublicScripts.length}
                    </span>
                    {filterQuery.trim() && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => setFilterQuery("")}
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
                 
                <div className="border rounded-lg bg-card overflow-y-auto min-h-0 flex-1">
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
                    ) : visiblePublicScripts.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">{t("readTab.empty")}</p>
                    ) : (
                        renderPublicItems(visiblePublicScripts)
                    )}
                </div>
            </div>


        </div>
    )
}
