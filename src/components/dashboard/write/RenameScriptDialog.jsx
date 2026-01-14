import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";

export function RenameScriptDialog({
    open,
    onOpenChange,
    type,
    oldName,
    newName,
    setNewName,
    handleRename,
    renaming
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{type === 'folder' ? '重新命名資料夾' : '重新命名劇本'}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        placeholder={type === 'folder' ? "資料夾名稱" : "劇本標題"}
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleRename} disabled={renaming || !newName.trim() || newName === oldName}>
                        {renaming && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        確認
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
