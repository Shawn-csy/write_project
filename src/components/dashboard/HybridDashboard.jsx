import React, { useEffect, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "../../contexts/AuthContext";
import { getUserScripts, createScript, updateScript, deleteScript, getPublicScripts } from "../../lib/db";
import { Loader2, FileText, Plus, Globe, Lock, Trash2, Folder, FolderOpen, MoreVertical, ChevronRight, Home } from "lucide-react";
import { Switch } from "../ui/switch";
import UserMenu from "../auth/UserMenu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function HybridDashboard({ 
    localFiles = [], 
    onSelectLocalFile, 
    onSelectCloudScript,
    onSelectPublicScript
}) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("read"); // read | write

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Screenplay Reader</h1>
        <div className="flex items-center gap-4">
            <UserMenu />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6 pt-4 shrink-0">
                <TabsList>
                    <TabsTrigger value="read" className="px-6">閱讀 (Read)</TabsTrigger>
                    <TabsTrigger value="write" className="px-6">創作 (Write)</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="read" className="flex-1 min-h-0 overflow-hidden flex flex-col p-6">
                <ReadTab 
                    localFiles={localFiles} 
                    onSelectLocalFile={onSelectLocalFile}
                    onSelectPublicScript={onSelectPublicScript}
                />
            </TabsContent>

            <TabsContent value="write" className="flex-1 min-h-0 overflow-hidden flex flex-col p-6">
                {currentUser ? (
                    <WriteTab onSelectScript={onSelectCloudScript} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center border-2 border-dashed rounded-xl m-4">
                        <Lock className="w-10 h-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">請先登入</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">
                            登入後即可開始創作、建立資料夾並管理您的雲端劇本。
                        </p>
                    </div>
                )}
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Reuseable File Row Component
const FileRow = ({ icon, title, meta, actions, onClick, isFolder }) => (
    <div 
        onClick={onClick}
        className="group flex items-center justify-between p-3 hover:bg-muted/50 border-b border-border/40 cursor-pointer transition-colors"
    >
        <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-md ${isFolder ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'} group-hover:bg-primary/10 group-hover:text-primary transition-colors`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <div className="font-medium truncate text-sm">{title}</div>
                {meta && <div className="text-xs text-muted-foreground truncate">{meta}</div>}
            </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {actions}
        </div>
    </div>
);

function ReadTab({ localFiles, onSelectLocalFile, onSelectPublicScript }) {
    const [publicScripts, setPublicScripts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPublicScripts()
            .then(setPublicScripts)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const formatDate = (ts) => new Date(ts).toLocaleDateString();

    return (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
             {/* Local Files */}
            <div className="flex-1 flex flex-col min-h-0">
                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 shrink-0">
                    <FolderOpen className="w-4 h-4" /> 本地檔案 (Local)
                </h3>
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
                                actions={null}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Public Files */}
            <div className="flex-1 flex flex-col min-h-0">
                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 shrink-0">
                    <Globe className="w-4 h-4" /> 公開劇本 (Community)
                </h3>
                <div className="border rounded-lg bg-card overflow-y-auto min-h-0 flex-1">
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
                    ) : publicScripts.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">目前沒有公開劇本</p>
                    ) : (
                        publicScripts.map(script => (
                            <FileRow 
                                key={script.id}
                                icon={<Globe className="w-4 h-4" />}
                                title={script.title || "Untitled"}
                                meta={`Updated: ${formatDate(script.lastModified)}`}
                                onClick={() => onSelectPublicScript(script)}
                                actions={
                                    <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">Public</span>
                                }
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

function WriteTab({ onSelectScript }) {
    const { currentUser } = useAuth();
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState("/"); // Virtual path, default root "/"
    
    // Modal States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState("script"); // script | folder
    const [creating, setCreating] = useState(false);

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

    // Handle File Structure
    const visibleItems = useMemo(() => {
        return scripts.filter(s => {
            const folder = s.folder || "/";
            return folder === currentPath;
        });
    }, [scripts, currentPath]);

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            const id = await createScript(newTitle, newType, currentPath);
            if (newType === 'script') {
                 // Optimization: Directly update list instead of refetch?
                 // But we need the logic.
                  onSelectScript({ id, title: newTitle, content: "", folder: currentPath, type: 'script' });
            } else {
                 setNewTitle("");
                 setIsCreateOpen(false);
                 fetchScripts(); // Reload to show new folder
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("確定要刪除嗎？")) return;
        try {
            await deleteScript(id);
            setScripts(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const handleTogglePublic = async (e, script) => {
        e.stopPropagation();
        const newVal = !script.isPublic;
        // Optimistic
        setScripts(prev => prev.map(s => s.id === script.id ? { ...s, isPublic: newVal ? 1 : 0 } : s));
        try {
            await updateScript(script.id, { isPublic: newVal });
        } catch (err) {
            console.error(err);
            fetchScripts();
        }
    };

    const formatDate = (ts) => new Date(ts).toLocaleDateString();

    const breadcrumbs = useMemo(() => {
        const parts = currentPath.split("/").filter(Boolean);
        let path = "";
        return parts.map(part => {
             path += "/" + part;
             return { name: part, path };  
        });
    }, [currentPath]);

    const navigateTo = (path) => setCurrentPath(path);
    const goUp = () => {
        const parts = currentPath.split("/").filter(Boolean);
        parts.pop();
        setCurrentPath(parts.length ? "/" + parts.join("/") : "/");
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden">
                    <button 
                        onClick={() => navigateTo("/")}
                        className={`flex items-center hover:text-foreground transition-colors ${currentPath === '/' ? 'text-foreground font-semibold' : ''}`}
                    >
                        <Home className="w-4 h-4 mr-1" />
                        Root
                    </button>
                    {breadcrumbs.map((crumb, i) => (
                        <React.Fragment key={crumb.path}>
                            <ChevronRight className="w-3 h-3 opacity-50" />
                            <button 
                                onClick={() => navigateTo(crumb.path)}
                                className={`hover:text-foreground transition-colors truncate ${i === breadcrumbs.length - 1 ? 'text-foreground font-semibold' : ''}`}
                            >
                                {crumb.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                     <Button size="sm" variant="outline" onClick={() => { setNewType('folder'); setIsCreateOpen(true); }} className="gap-2">
                        <Folder className="w-4 h-4" /> 新增資料夾
                     </Button>
                     <Button size="sm" onClick={() => { setNewType('script'); setIsCreateOpen(true); }} className="gap-2">
                        <Plus className="w-4 h-4" /> 新增劇本
                     </Button>
                </div>
            </div>

            {/* File List */}
            <div className="border rounded-lg bg-card flex-1 min-h-0 overflow-y-auto">
                 {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                 ) : visibleItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">此資料夾為空</div>
                 ) : (
                    <div>
                         {/* Go Up Option if not root */}
                         {currentPath !== "/" && (
                            <div 
                                onClick={goUp}
                                className="flex items-center gap-3 p-3 hover:bg-muted/50 border-b border-border/40 cursor-pointer text-muted-foreground"
                            >
                                <div className="p-2 w-8 h-8 flex items-center justify-center">
                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                </div>
                                <span className="text-sm font-medium">.. (上一層)</span>
                            </div>
                         )}

                         {/* Folders First */}
                         {visibleItems.filter(i => i.type === 'folder').map(folder => (
                             <FileRow 
                                key={folder.id}
                                isFolder={true}
                                icon={<Folder className="w-4 h-4" />}
                                title={folder.title}
                                meta={`Created: ${formatDate(folder.createdAt)}`}
                                onClick={() => navigateTo(currentPath === '/' ? `/${folder.title}` : `${currentPath}/${folder.title}`)}
                                actions={
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => handleDelete(e, folder.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                }
                             />
                         ))}

                         {/* Scripts */}
                         {visibleItems.filter(i => i.type !== 'folder').map(script => (
                             <FileRow 
                                key={script.id}
                                isFolder={false}
                                icon={<FileText className="w-4 h-4" />}
                                title={script.title || "Untitled"}
                                meta={`Updated: ${formatDate(script.lastModified)}`}
                                onClick={() => onSelectScript(script)}
                                actions={
                                    <>
                                        <div className="flex items-center gap-2 mr-2 bg-muted/40 px-2 py-1 rounded">
                                            <Switch 
                                                checked={!!script.isPublic}
                                                onCheckedChange={(checked) => handleTogglePublic({ stopPropagation: () => {} }, script)}
                                                className="scale-75 origin-right"
                                            />
                                            <span className="text-[10px] w-6 text-center">{script.isPublic ? "公開" : "私有"}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => handleDelete(e, script.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </>
                                }
                             />
                         ))}
                    </div>
                 )}
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{newType === 'folder' ? '建立新資料夾' : '建立新劇本'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            placeholder={newType === 'folder' ? "資料夾名稱" : "劇本標題"}
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            autoFocus
                        />
                         <p className="text-xs text-muted-foreground mt-2">
                            位置: {currentPath}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
                        <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                            {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            建立
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
