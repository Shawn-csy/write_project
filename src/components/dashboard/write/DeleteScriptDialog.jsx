import React, { useMemo } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";

function buildPath(item) {
    if (!item) return "/";
    const parent = item.folder === "/" ? "" : item.folder;
    return `${parent}/${item.title}`;
}

export function DeleteScriptDialog({
    open,
    onOpenChange,
    item,
    scripts,
    deleting,
    onConfirm
}) {
    const childCount = useMemo(() => {
        if (!item || item.type !== "folder") return 0;
        const prefix = buildPath(item);
        return scripts.filter(s => s.folder === prefix || s.folder.startsWith(prefix + "/")).length;
    }, [item, scripts]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-4 h-4" />
                        刪除{item?.type === "folder" ? "資料夾" : "文件"}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                    <p>
                        你即將刪除：<span className="font-semibold">{item?.title || "-"}</span>
                    </p>
                    <p className="text-muted-foreground">路徑：{item ? buildPath(item) : "/"}</p>
                    {item?.type === "folder" && (
                        <p className="text-destructive">
                            此操作會一併刪除子項目 {childCount} 筆，且無法復原。
                        </p>
                    )}
                    {item?.type !== "folder" && (
                        <p className="text-destructive">此操作無法復原。</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
                        取消
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={deleting || !item}>
                        {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        確認刪除
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
