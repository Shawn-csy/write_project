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

export function ReadTab({ localFiles, onSelectLocalFile, onSelectPublicScript, enableLocalFiles, onImportFile, onImportAll }) {
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

    const handleImport = async (e, file) => {
        e.stopPropagation();
        if (!confirm(`確定要將 ${file.name} 匯入到資料庫嗎？`)) return;
        try {
            await onImportFile(file);
        } catch(err) {
            console.error(err);
            alert("匯入失敗");
        }
    };

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
            {enableLocalFiles && (
            <div className="flex-1 flex flex-col min-h-0">
                 <div className="flex items-center justify-between mb-2 shrink-0">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" /> 本地檔案 (Local)
                    </h3>
                    {onImportAll && localFiles.length > 0 && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            onClick={() => onImportAll(localFiles)}
                        >
                            <CloudUpload className="w-3 h-3" /> 全部匯入
                        </Button>
                    )}
                 </div>
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
                                actions={
                                    onImportFile && (
                                        <div className="flex items-center">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                onClick={(e) => handleImport(e, file)}
                                                title="匯入到資料庫"
                                            >
                                                <CloudUpload className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )
                                }
                            />
                        ))
                    )}
                </div>
            </div>
            )}

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
