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

export function ReadTab({ localFiles, onSelectLocalFile, onSelectPublicScript, enableLocalFiles, onImportFile, onImportAll }) {
    const [publicScripts, setPublicScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedPublic, setExpandedPublic] = useState(new Set()); 
    const [publicCache, setPublicCache] = useState({}); 

    // Import Confirmation State
    const [importConfirmOpen, setImportConfirmOpen] = useState(false);
    const [filesToImport, setFilesToImport] = useState([]);

    // Use File Tree Hook for local files
    const { filteredTree, openFolders, toggleFolder } = useFileTree(localFiles, "", {});

    useEffect(() => {
        getPublicScripts()
            .then(setPublicScripts)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const formatDate = (ts) => new Date(ts).toLocaleDateString();

    const handleImportClick = (e, files) => {
        e.preventDefault();
        e.stopPropagation();
        setFilesToImport(files);
        setImportConfirmOpen(true);
    };

    const confirmImport = async () => {
        setImportConfirmOpen(false);
        if (filesToImport.length === 1 && onImportFile) {
            await onImportFile(filesToImport[0]);
        } else if (filesToImport.length > 1 && onImportAll) {
            await onImportAll(filesToImport);
        }
        setFilesToImport([]);
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

    const renderLocalItems = (nodes, level = 0) => {
        if (!nodes) return null;
        return nodes.map((node) => {
            const isFolder = !!node.children;
            const isOpen = openFolders.has(node.path);

            return (
                <React.Fragment key={node.path}>
                    <FileRow
                        style={{ paddingLeft: `${16 + (level * 20)}px` }}
                        isFolder={true}
                        icon={<Folder className={`w-4 h-4 ${isOpen ? "fill-blue-500/20" : ""}`} />}
                        title={node.name}
                        onClick={() => toggleFolder(node.path)}
                    />
                    {isOpen && (
                         <>
                            {renderLocalItems(node.children, level + 1)}
                            {node.files.map(file => (
                                <FileRow 
                                    key={file.path}
                                    style={{ paddingLeft: `${16 + ((level + 1) * 20)}px` }}
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
                                                    onClick={(e) => handleImportClick(e, [file])}
                                                    title="匯入到資料庫"
                                                >
                                                    <CloudUpload className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )
                                    }
                                />
                            ))}
                         </>
                    )}
                </React.Fragment>
            );
        });
    };

    // Helper to render root files that are not in any folder
    const renderRoot = () => {
        if (!filteredTree) return null;
        return (
            <>
               {renderLocalItems(filteredTree.children)}
               {filteredTree.files.map(file => (
                   <FileRow 
                        key={file.path}
                        style={{ paddingLeft: "16px" }}
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
                                        onClick={(e) => handleImportClick(e, [file])}
                                        title="匯入到資料庫"
                                    >
                                        <CloudUpload className="w-4 h-4" />
                                    </Button>
                                </div>
                            )
                        }
                    />
               ))}
            </>
        )
    }

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
                            onClick={(e) => handleImportClick(e, localFiles)}
                        >
                            <CloudUpload className="w-3 h-3" /> 全部匯入
                        </Button>
                    )}
                 </div>
                <div className="border rounded-lg bg-card overflow-y-auto min-h-0 flex-1">
                     {localFiles.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">沒有本地檔案</p>
                    ) : (
                        renderRoot()
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

            <Dialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>確認匯入</DialogTitle>
                        <DialogDescription>
                            {filesToImport.length === 1 
                                ? `確定要將 "${filesToImport[0]?.name}" 匯入到資料庫嗎？`
                                : `確定要將 ${filesToImport.length} 個本地檔案全部匯入雲端嗎？`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setImportConfirmOpen(false)}>取消</Button>
                        <Button onClick={confirmImport}>確認匯入</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
