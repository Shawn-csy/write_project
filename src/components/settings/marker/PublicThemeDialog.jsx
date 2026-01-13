import React, { useState, useEffect } from "react";
import { 
    Globe, Copyright, Download, Trash2, ChevronUp, ChevronDown 
} from "lucide-react";
import { Button } from "../../ui/button";
import { ScrollArea } from "../../ui/scroll-area";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogTrigger, DialogDescription 
} from "../../ui/dialog";
import { useSettings } from "../../../contexts/SettingsContext";

export function PublicThemeDialog() {
    const { copyPublicTheme, deleteTheme, currentUser } = useSettings();
    const [publicThemes, setPublicThemes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            fetch('/api/themes/public')
                .then(res => res.json())
                .then(data => setPublicThemes(data))
                .catch(e => console.error(e))
                .finally(() => setLoading(false));
        }
    }, [open]);

    const handleCopy = async (theme) => {
        if (!confirm(`確定要將主題 "${theme.name}" 加入到您的收藏嗎？`)) return;
        await copyPublicTheme(theme.id);
        setOpen(false);
    };

    const handleDelete = async (theme) => {
        if (!confirm(`確定要刪除您的公開主題 "${theme.name}" 嗎？此動作無法復原。`)) return;
        try {
            // Delete via Context (which calls API)
            await deleteTheme(theme.id);
            // Refresh list
            setPublicThemes(prev => prev.filter(t => t.id !== theme.id));
        } catch (e) {
            alert("刪除失敗");
        }
    };
    
    // Preview Logic
    const [previewId, setPreviewId] = useState(null);
    const togglePreview = (id) => setPreviewId(prev => prev === id ? null : id);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span className="text-xs">瀏覽公開主題</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>公開標記主題庫 (Public Themes)</DialogTitle>
                    <DialogDescription>
                        瀏覽並下載其他使用者分享的標記主題。
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 p-1">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">載入中...</div>
                    ) : (
                        <div className="grid gap-4 p-4">
                            {publicThemes.length === 0 && (
                                <div className="text-center text-muted-foreground text-sm">目前沒有公開的主題。分享您的主題來豐富這個列表！</div>
                            )}
                            {publicThemes.map(theme => {
                                const isOwner = currentUser && (theme.ownerId === currentUser.uid || theme.owner?.id === currentUser.uid);
                                const configs = previewId === theme.id ? JSON.parse(theme.configs || "[]") : [];
                                
                                return (
                                <div key={theme.id} className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1 cursor-pointer flex-1" onClick={() => togglePreview(theme.id)}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">{theme.name}</span>
                                                {theme.isPublic && <span className="text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 px-1.5 py-0.5 rounded-full">Public</span>}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                               {theme.description || "無描述"} • {new Date(theme.updatedAt).toLocaleDateString()}
                                               {previewId === theme.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </div>
                                            <div className="flex gap-1 mt-2">
                                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground flex items-center gap-1">
                                                    By {theme.owner?.displayName || "Unknown"}
                                                    {theme.owner?.handle && <span className="opacity-50">@{theme.owner.handle}</span>}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isOwner && (
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(theme)} title="刪除此主題">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button size="sm" variant="secondary" onClick={() => handleCopy(theme)}>
                                                <Download className="w-3.5 h-3.5 mr-2" />
                                                下載
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {/* Preview Section */}
                                    {previewId === theme.id && (
                                        <div className="mt-4 pt-4 border-t grid gap-2">
                                            <h4 className="text-xs font-semibold text-muted-foreground mb-1">包含標記 ({configs.length})：</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {configs.map((m, idx) => (
                                                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full border bg-background text-foreground">
                                                        {m.label || m.id} <span className="opacity-50">({m.type || 'unknown'})</span>
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                                預覽: {configs.slice(0,3).map(c => c.label).join(", ")}...
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
