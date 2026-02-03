import React, { useEffect, useState } from "react";
import { 
    Loader2, 
    FileText, 
    Globe, 
    FolderOpen, 
    CloudUpload, 
    Folder
} from "lucide-react";
import { Button } from "../ui/button";
import { getPublicScripts } from "../../lib/db";
import { FileRow } from "./FileRow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

import { useFileTree } from "../../hooks/useFileTree";

export function ReadTab({ onSelectPublicScript }) {
    const [publicScripts, setPublicScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedPublic, setExpandedPublic] = useState(new Set()); 
    const [publicCache, setPublicCache] = useState({}); 



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
    }, [publicCache]); // Depend on publicCache? No, this effect should run once on mount or when URL changes. 
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



    const renderPublicItems = (items, level = 0) => {
        if (!items) return null;
        return items.map(script => {
             const fullPath = (script.folder === '/' ? '' : script.folder) + '/' + script.title;
             const key = `${script.ownerId}:${fullPath}`;
             const isExpanded = expandedPublic.has(key);
             const isFolder = script.type === 'folder';

             return (
                 <React.Fragment key={script.id}>
                    <FileRow 
                        // Use paddingLeft to indent content while keeping hover full width
                        style={{ paddingLeft: `${16 + (level * 20)}px` }}
                        isFolder={isFolder}
                        icon={isFolder ? <Folder className={`w-4 h-4 ${isExpanded ? "fill-blue-500/20" : ""}`} /> : <Globe className="w-4 h-4" />}
                        title={script.title || "Untitled"}
                        meta={isFolder ? null : `Updated: ${formatDate(script.lastModified)}`}
                        onClick={(e) => {
                             if (isFolder) {
                                 togglePublicExpand(e, script);
                             } else {
                                 onSelectPublicScript(script);
                             }
                        }}
                        actions={
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">Public</span>
                            </div>
                        }
                    />
                    {isFolder && isExpanded && (
                        publicCache[key] ? renderPublicItems(publicCache[key], level + 1) : <div className="pl-8 py-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin"/> Loading...</div>
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
                        <Globe className="w-4 h-4" /> 公開劇本 (Community)
                    </h3>
                 </div>
                 
                <div className="border rounded-lg bg-card overflow-y-auto min-h-0 flex-1">
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
                    ) : publicScripts.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">目前沒有公開內容</p>
                    ) : (
                        renderPublicItems(publicScripts)
                    )}
                </div>
            </div>


        </div>
    )
}
