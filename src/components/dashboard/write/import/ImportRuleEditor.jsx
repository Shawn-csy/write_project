import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";
import { Badge } from "../../../ui/badge";
import { Label } from "../../../ui/label";
import { Input } from "../../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Button } from "../../../ui/button";
import { Trash2 } from "lucide-react";

export function ImportRuleEditor({ rule, onChange, onDelete }) {
    const ruleColor = rule.style?.color || rule.color || "#000000";
    const fieldKey = String(rule.id || rule.label || rule.start || rule.pattern || "rule").replace(/\s+/g, "-");

    const updateRule = (field, value) => {
        onChange({ ...rule, [field]: value });
    };

    const updateStyle = (styleField, value) => {
        const newStyle = { ...(rule.style || {}), [styleField]: value };
        updateRule("style", newStyle);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded border bg-card text-xs cursor-pointer hover:border-primary transition-colors group">
                    <Badge 
                        variant="outline" 
                        className="font-mono min-w-[2rem] justify-center group-hover:bg-accent"
                        style={{ borderColor: ruleColor, color: ruleColor, backgroundColor: `${ruleColor}10` }}
                    >
                        {rule.pattern || rule.start}
                    </Badge>
                    <span className="text-muted-foreground">➜</span>
                    <span className="font-medium truncate">{rule.label || rule.type}</span>
                    <div className="w-2 h-2 rounded-full ml-auto" style={{ backgroundColor: ruleColor }} />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[90vw] sm:w-96" side="bottom" align="start">
                <div className="grid gap-4 max-h-[500px] overflow-y-auto">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">編輯標記規則</h4>
                        <p className="text-sm text-muted-foreground">
                            調整此規則的識別方式與顯示樣式。
                        </p>
                    </div>
                    
                    {/* 樣式設定 (Style) */}
                    <div className="grid gap-2 p-3 bg-muted/20 rounded-md">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">顯示樣式</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                            <Label htmlFor={`color-${fieldKey}`} className="text-xs">顏色</Label>
                            <div className="col-span-2 flex gap-2">
                                <Input
                                    id={`color-${fieldKey}`}
                                    type="color"
                                    value={ruleColor}
                                    className="w-12 h-6 p-0 px-1"
                                    onChange={(e) => updateStyle('color', e.target.value)}
                                />
                                <Input 
                                    value={ruleColor} 
                                    className="h-6 text-xs flex-1" 
                                    onChange={(e) => updateStyle('color', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                            <Label htmlFor={`label-${fieldKey}`} className="text-xs">顯示標籤</Label>
                            <Input
                                id={`label-${fieldKey}`}
                                value={rule.label || ""}
                                className="sm:col-span-2 h-6 text-xs"
                                onChange={(e) => updateRule('label', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 邏輯設定 (Logic) */}
                    <div className="grid gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-md border border-blue-100 dark:border-blue-900">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">識別邏輯</div>
                        
                        {/* 模式選擇 */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                            <Label className="text-xs">模式</Label>
                            <Select 
                                value={rule.matchMode || (rule.type === 'prefix' ? 'prefix' : 'enclosure')}
                                onValueChange={(val) => {
                                    // 當切換模式時，預設一些值
                                    updateRule("matchMode", val);
                                    if (val === 'prefix') {
                                        updateRule("end", "");
                                    }
                                }}
                            >
                                <SelectTrigger className="sm:col-span-2 h-7 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="prefix">行首前綴 (Prefix)</SelectItem>
                                    <SelectItem value="enclosure">包圍符號 (Start...End)</SelectItem>
                                    <SelectItem value="regex">正規表達式 (Regex)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 區塊/行內切換 */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                            <Label className="text-xs">層級</Label>
                            <div className="col-span-2 flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={!!rule.isBlock}
                                        onChange={(e) => updateRule('isBlock', e.target.checked)}
                                        className="rounded border-gray-300 text-xs"
                                    />
                                    <span className="text-xs text-muted-foreground">視為區塊 (Block)</span>
                                </label>
                            </div>
                        </div>

                        {/* 符號設定 */}
                        {rule.matchMode === 'regex' ? (
                                <div className="space-y-1">
                                <Label className="text-xs">Regex Pattern</Label>
                                <Input
                                    value={rule.regex || ""}
                                    className="h-7 text-xs font-mono"
                                    onChange={(e) => updateRule('regex', e.target.value)}
                                />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                                    <Label className="text-xs">開始符號</Label>
                                    <Input
                                        value={rule.start || ""}
                                        className="sm:col-span-2 h-7 text-xs font-mono"
                                        onChange={(e) => updateRule('start', e.target.value)}
                                    />
                                </div>
                                
                                {(rule.matchMode === 'enclosure' || (!rule.matchMode && rule.end)) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                                        <Label className="text-xs">結束符號</Label>
                                        <Input
                                            value={rule.end || ""}
                                            className="sm:col-span-2 h-7 text-xs font-mono"
                                            onChange={(e) => updateRule('end', e.target.value)}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* 顯示樣板 (Template) */}
                    <div className="grid gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-md border border-indigo-100 dark:border-indigo-900">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">顯示樣板 (Replace With)</div>
                        <div className="space-y-2">
                            <Label className="text-xs">樣板內容</Label>
                            <Input 
                                value={rule.renderer?.template || ""}
                                onChange={(e) => {
                                    const renderer = rule.renderer || {};
                                    updateRule('renderer', { ...renderer, template: e.target.value });
                                }}
                                className="h-7 text-xs font-mono"
                                placeholder="例如: [SFX: {{content}}]"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                使用 <code>{'{{content}}'}</code> 代表原始內容。
                            </p>
                        </div>
                    </div>
                    {onDelete && (
                        <div className="pt-2 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full text-destructive hover:text-destructive"
                                onClick={onDelete}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                刪除此規則
                            </Button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
