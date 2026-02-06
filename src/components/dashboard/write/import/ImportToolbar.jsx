import React, { useState, useCallback } from "react";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";
import { Save } from "lucide-react";

export function ImportToolbar({ 
    activeRules, 
    cloudConfigs, 
    selectedConfigId, 
    onConfigChange,
    onSaveConfig 
}) {
    const [newConfigName, setNewConfigName] = useState("");
    const [savePopoverOpen, setSavePopoverOpen] = useState(false);

    const handleSave = useCallback(() => {
        if (!newConfigName.trim()) return;
        onSaveConfig(newConfigName.trim());
        setSavePopoverOpen(false);
        setNewConfigName("");
    }, [newConfigName, onSaveConfig]);

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-muted/30 p-2 rounded border">
            <span className="text-sm font-medium">使用設定檔：</span>
            <Select value={selectedConfigId} onValueChange={onConfigChange}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="選擇設定檔" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="auto">✨ 自動偵測 (Auto)</SelectItem>
                    {cloudConfigs.map(config => (
                        <SelectItem key={config.id} value={config.id}>
                            {config.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            
            {/* Save Button */}
            <Popover open={savePopoverOpen} onOpenChange={setSavePopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="儲存為新設定">
                        <Save className="w-4 h-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">儲存設定</h4>
                            <p className="text-sm text-muted-foreground">
                                將目前的標記規則儲存為新的設定檔。
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={newConfigName}
                                onChange={e => setNewConfigName(e.target.value)}
                                placeholder="設定檔名稱..."
                                className="h-8"
                            />
                            <Button size="sm" onClick={handleSave} disabled={!newConfigName.trim()}>
                                儲存
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
            
            <div className="sm:ml-auto text-xs text-muted-foreground">
                套用 {activeRules.length} 條規則
            </div>
        </div>
    );
}
