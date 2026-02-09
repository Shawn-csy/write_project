import React from "react";
import { Loader2, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Badge } from "../../ui/badge";

export function PublisherWorksTab({ isLoading, scripts, setEditingScript, navigate, formatDate }) {
    const [filter, setFilter] = React.useState("all"); // all, public, private

    const filteredScripts = scripts.filter(script => {
        if (filter === "public") return script.status === "Public";
        if (filter === "private") return script.status !== "Public";
        return true;
    });

    return (
        <div className="grid gap-4">
            <div className="flex items-center gap-2 pb-2">
                <Button 
                    variant={filter === "all" ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setFilter("all")}
                    className="h-8 rounded-full text-xs"
                >
                    全部 ({scripts.length})
                </Button>
                <Button 
                    variant={filter === "public" ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setFilter("public")}
                    className="h-8 rounded-full text-xs"
                >
                    已公開 ({scripts.filter(s => s.status === "Public").length})
                </Button>
                <Button 
                    variant={filter === "private" ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setFilter("private")}
                    className="h-8 rounded-full text-xs"
                >
                    未公開 ({scripts.filter(s => s.status !== "Public").length})
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div>
            ) : filteredScripts.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 border rounded-lg border-dashed">
                    {filter === "all" ? "尚未有任何作品" : filter === "public" ? "尚未有公開作品" : "尚未有未公開作品"}
                </div>
            ) : filteredScripts.map(script => (
                <Card key={script.id} className="flex flex-col sm:flex-row overflow-hidden group">
                    {/* Thumbnail */}
                    <div className="w-full sm:w-32 h-32 bg-muted shrink-0 relative">
                            {script.coverUrl ? (
                            <img src={script.coverUrl} alt={script.title} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground bg-secondary/30">
                                <span className="text-xs italic">No Cover</span>
                            </div>
                            )}
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-lg font-serif">{script.title}</h3>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>更新：{formatDate(script.lastModified)}</span>
                                    <span>•</span>
                                    <Badge variant={script.status === "Public" ? "default" : "secondary"} className="h-5 text-[10px]">
                                        {script.status === "Public" ? "公開" : "私人"}
                                    </Badge>
                                </div>
                            </div>
                            
                            {/* Stats (Visible only if public) */}
                            {script.status === "Public" && (
                                <div className="flex gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1"><Eye className="w-4 h-4" /> {script.views}</div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border/50">
                            <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditingScript(script)}>
                                <Edit className="w-3.5 h-3.5 mr-1.5" /> 編輯資訊
                            </Button>
                            {script.status === "Public" && (
                                    <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => navigate(`/read/${script.id}`)}
                                    >
                                    <Eye className="w-3.5 h-3.5 mr-1.5" /> 查看公開頁
                                    </Button>
                            )}
                            <div className="flex-1"></div>
                            <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
