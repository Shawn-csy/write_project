import React from "react";
import { Input } from "../../../ui/input";
import { useI18n } from "../../../../contexts/I18nContext";

export function MarkerGeneralSettings({ config, idx, updateMarker, isAdvancedMode = true }) {
    const { t } = useI18n();
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 items-end">
            <div className="col-span-1 space-y-1">
                <label className="text-[10px] uppercase text-muted-foreground font-semibold">{t("markerGeneral.name")} <span className="text-destructive">*</span></label>
                <Input 
                    value={config.label || ''} 
                    onChange={(e) => updateMarker(idx, 'label', e.target.value)}
                    className={`h-8 text-xs ${!config.label ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {!config.label && (
                    <p className="text-[10px] text-destructive font-medium">{t("markerGeneral.required")}</p>
                )}
            </div>
             <div className="col-span-1 space-y-1">
                <label className="text-[10px] uppercase text-muted-foreground font-semibold">{t("markerGeneral.type")}</label>
                <select 
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    value={config.type || (config.isBlock ? 'block' : 'inline')}
                    onChange={(e) => {
                        const nextType = e.target.value;
                        updateMarker(idx, { 
                            type: nextType, 
                            isBlock: nextType === 'block' || nextType === 'dual' 
                        });
                    }}
                >
                    <option value="inline">{t("markerGeneral.inline")}</option>
                    <option value="block">{t("markerGeneral.block")}</option>
                    <option value="dual">{t("markerGeneral.dual")}</option>
                </select>
             </div>
             {isAdvancedMode && (
                 <div className="col-span-1 space-y-1">
                    <label className="text-[10px] uppercase text-muted-foreground font-semibold">{t("markerGeneral.priority")}</label>
                    <Input 
                        type="number"
                        value={config.priority || 0} 
                        onChange={(e) => updateMarker(idx, 'priority', parseInt(e.target.value) || 0)}
                        className="h-8 text-xs text-center font-mono bg-muted/20"
                        title={t("markerGeneral.priorityHint")}
                    />
                 </div>
             )}
        </div>
    );
}
