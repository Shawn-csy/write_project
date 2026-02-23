import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";
import { Badge } from "../../../ui/badge";
import { Label } from "../../../ui/label";
import { Input } from "../../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Button } from "../../../ui/button";
import { Trash2 } from "lucide-react";
import { useI18n } from "../../../../contexts/I18nContext";

export function ImportRuleEditor({ rule, onChange, onDelete }) {
    const { t } = useI18n();
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
                        <h4 className="font-medium leading-none">{t("importRuleEditor.title")}</h4>
                        <p className="text-sm text-muted-foreground">
                            {t("importRuleEditor.desc")}
                        </p>
                    </div>
                    
                    {/* Style settings */}
                    <div className="grid gap-2 p-3 bg-muted/20 rounded-md">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">{t("importRuleEditor.styleSection")}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                            <Label htmlFor={`color-${fieldKey}`} className="text-xs">{t("importRuleEditor.color")}</Label>
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
                            <Label htmlFor={`label-${fieldKey}`} className="text-xs">{t("importRuleEditor.displayLabel")}</Label>
                            <Input
                                id={`label-${fieldKey}`}
                                value={rule.label || ""}
                                className="sm:col-span-2 h-6 text-xs"
                                onChange={(e) => updateRule('label', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Logic settings */}
                    <div className="grid gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-md border border-blue-100 dark:border-blue-900">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">{t("importRuleEditor.logicSection")}</div>
                        
                        {/* Mode selector */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                            <Label className="text-xs">{t("importRuleEditor.mode")}</Label>
                            <Select 
                                value={rule.matchMode || (rule.type === 'prefix' ? 'prefix' : 'enclosure')}
                                onValueChange={(val) => {
                                    // Reset end symbol when switched to prefix mode.
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
                                    <SelectItem value="prefix">{t("importRuleEditor.modePrefix")}</SelectItem>
                                    <SelectItem value="enclosure">{t("importRuleEditor.modeEnclosure")}</SelectItem>
                                    <SelectItem value="regex">{t("importRuleEditor.modeRegex")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Block/inline toggle */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                            <Label className="text-xs">{t("importRuleEditor.level")}</Label>
                            <div className="col-span-2 flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={!!rule.isBlock}
                                        onChange={(e) => updateRule('isBlock', e.target.checked)}
                                        className="rounded border-gray-300 text-xs"
                                    />
                                    <span className="text-xs text-muted-foreground">{t("importRuleEditor.treatAsBlock")}</span>
                                </label>
                            </div>
                        </div>

                        {/* Symbol settings */}
                        {rule.matchMode === 'regex' ? (
                                <div className="space-y-1">
                                <Label className="text-xs">{t("importRuleEditor.regexPattern")}</Label>
                                <Input
                                    value={rule.regex || ""}
                                    className="h-7 text-xs font-mono"
                                    onChange={(e) => updateRule('regex', e.target.value)}
                                />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                                    <Label className="text-xs">{t("importRuleEditor.startSymbol")}</Label>
                                    <Input
                                        value={rule.start || ""}
                                        className="sm:col-span-2 h-7 text-xs font-mono"
                                        onChange={(e) => updateRule('start', e.target.value)}
                                    />
                                </div>
                                
                                {(rule.matchMode === 'enclosure' || (!rule.matchMode && rule.end)) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                                        <Label className="text-xs">{t("importRuleEditor.endSymbol")}</Label>
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

                    {/* Display template */}
                    <div className="grid gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-md border border-indigo-100 dark:border-indigo-900">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">{t("importRuleEditor.templateSection")}</div>
                        <div className="space-y-2">
                            <Label className="text-xs">{t("importRuleEditor.templateContent")}</Label>
                            <Input 
                                value={rule.renderer?.template || ""}
                                onChange={(e) => {
                                    const renderer = rule.renderer || {};
                                    updateRule('renderer', { ...renderer, template: e.target.value });
                                }}
                                className="h-7 text-xs font-mono"
                                placeholder={t("importRuleEditor.templatePlaceholder")}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                {t("importRuleEditor.templateHelpPrefix")} <code>{'{{content}}'}</code> {t("importRuleEditor.templateHelpSuffix")}
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
                                {t("importRuleEditor.deleteRule")}
                            </Button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
