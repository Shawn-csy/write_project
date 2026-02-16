import React from "react";
import { Loader2, Eye, Edit, FilePenLine } from "lucide-react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Badge } from "../../ui/badge";

export function PublisherWorksTab({ isLoading, scripts, setEditingScript, navigate, formatDate, onContinueEdit }) {
    const [filter, setFilter] = React.useState("all"); // all, public, private
    const INITIAL_VISIBLE = 12;
    const PREFETCH_STEP = 24;
    const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE);

    const stats = React.useMemo(() => {
        let publicCount = 0;
        let privateCount = 0;
        (scripts || []).forEach((script) => {
            const isPublic = script.status === "Public" || script.isPublic;
            if (isPublic) publicCount += 1;
            else privateCount += 1;
        });
        return { total: (scripts || []).length, publicCount, privateCount };
    }, [scripts]);

    const filteredScripts = React.useMemo(() => {
        return (scripts || []).filter((script) => {
            const isPublic = script.status === "Public" || script.isPublic;
            if (filter === "public") return isPublic;
            if (filter === "private") return !isPublic;
            return true;
        });
    }, [scripts, filter]);

    React.useEffect(() => {
        setVisibleCount(INITIAL_VISIBLE);
    }, [filter, scripts]);

    React.useEffect(() => {
        if (isLoading) return;
        if (visibleCount >= filteredScripts.length) return;

        let cancelled = false;
        let idleId = null;
        let timerId = null;

        const prefetchNextBatch = () => {
            if (cancelled) return;
            setVisibleCount((prev) => Math.min(prev + PREFETCH_STEP, filteredScripts.length));
        };

        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
            idleId = window.requestIdleCallback(prefetchNextBatch, { timeout: 300 });
        } else {
            timerId = window.setTimeout(prefetchNextBatch, 120);
        }

        return () => {
            cancelled = true;
            if (idleId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
                window.cancelIdleCallback(idleId);
            }
            if (timerId !== null) {
                window.clearTimeout(timerId);
            }
        };
    }, [filteredScripts.length, isLoading, visibleCount]);

    const visibleScripts = React.useMemo(
        () => filteredScripts.slice(0, visibleCount),
        [filteredScripts, visibleCount]
    );
    const hasMore = visibleCount < filteredScripts.length;
    const loadMore = React.useCallback(() => {
        setVisibleCount((prev) => Math.min(prev + PREFETCH_STEP, filteredScripts.length));
    }, [filteredScripts.length]);

    return (
        <div className="grid gap-4">
            <div className="flex items-center gap-2 pb-2">
                <Button 
                    variant={filter === "all" ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setFilter("all")}
                    className="h-8 rounded-full text-xs"
                >
                    全部 ({stats.total})
                </Button>
                <Button 
                    variant={filter === "public" ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setFilter("public")}
                    className="h-8 rounded-full text-xs"
                >
                    已公開 ({stats.publicCount})
                </Button>
                <Button 
                    variant={filter === "private" ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setFilter("private")}
                    className="h-8 rounded-full text-xs"
                >
                    未公開 ({stats.privateCount})
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div>
            ) : filteredScripts.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 border rounded-lg border-dashed">
                    {filter === "all" ? "尚未有任何作品" : filter === "public" ? "尚未有公開作品" : "尚未有未公開作品"}
                </div>
            ) : (
                <>
                    {visibleScripts.map(script => (
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
                            <Button variant="secondary" size="sm" className="h-8" onClick={() => onContinueEdit?.(script)}>
                                <FilePenLine className="w-3.5 h-3.5 mr-1.5" /> 繼續寫作
                            </Button>
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
                        </div>
                    </div>
                </Card>
                    ))}
                    {hasMore && (
                        <div className="pt-2 text-center">
                            <Button variant="outline" size="sm" onClick={loadMore}>
                                載入更多
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
