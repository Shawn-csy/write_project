import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";

function normalizePath(path) {
    return path === "/" ? "/" : (path || "/");
}

export function MoveScriptDialog({
    open,
    onOpenChange,
    item,
    availableFolders,
    targetFolder,
    setTargetFolder,
    moving,
    onConfirm
}) {
    const disabled = !item || item.type === "folder";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>移動文件</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                    <p>
                        文件：<span className="font-semibold">{item?.title || "-"}</span>
                    </p>
                    {disabled ? (
                        <p className="text-muted-foreground">目前僅支援移動文件，資料夾移動將在下一版提供。</p>
                    ) : (
                        <div>
                            <label className="block mb-1 text-muted-foreground">目標資料夾</label>
                            <select
                                className="w-full h-9 rounded-md border border-input bg-background px-2"
                                value={normalizePath(targetFolder)}
                                onChange={(e) => setTargetFolder(e.target.value)}
                            >
                                {availableFolders.map((folder) => (
                                    <option key={folder} value={folder}>
                                        {folder}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={moving}>
                        取消
                    </Button>
                    <Button onClick={onConfirm} disabled={moving || disabled}>
                        {moving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        確認移動
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
