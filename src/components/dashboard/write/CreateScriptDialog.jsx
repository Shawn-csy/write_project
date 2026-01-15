import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";

export function CreateScriptDialog({
    open,
    onOpenChange,
    newType,
    newTitle,
    setNewTitle,
    handleCreate,
    creating,
    currentPath
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                        {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        建立
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
