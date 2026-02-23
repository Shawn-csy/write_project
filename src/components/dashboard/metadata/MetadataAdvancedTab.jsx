import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { useI18n } from "../../../contexts/I18nContext";

export function MetadataAdvancedTab({
    markerThemeId, setMarkerThemeId,
    markerThemes,
    showMarkerLegend, setShowMarkerLegend,
    disableCopy, setDisableCopy,
    jsonMode, setJsonMode,
    jsonText, setJsonText,
    jsonError,
    applyJson
}) {
    const { t } = useI18n();
    return (
        <div className="space-y-4 mt-0">
            <div className="grid gap-2">
                <label className="text-sm font-medium">{t("metadataAdvanced.markerTheme")}</label>
                <Select value={markerThemeId} onValueChange={setMarkerThemeId}>
                    <SelectTrigger>
                        <SelectValue placeholder={t("metadataAdvanced.markerThemePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                        {markerThemes.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                    {t("metadataAdvanced.markerThemeTip")}
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                    <input 
                        type="checkbox" 
                        id="showLegend" 
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={showMarkerLegend}
                        onChange={(e) => setShowMarkerLegend(e.target.checked)}
                    />
                    <label htmlFor="showLegend" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none cursor-pointer">
                        {t("metadataAdvanced.showLegend")}
                    </label>
                </div>
            </div>

            {/* Content Protection */}
            <div className="pt-4 border-t">
                <label className="text-sm font-medium">{t("metadataAdvanced.contentProtection")}</label>
                <div className="flex items-center space-x-2 pt-2">
                    <input 
                        type="checkbox" 
                        id="disableCopy" 
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={disableCopy}
                        onChange={(e) => setDisableCopy(e.target.checked)}
                    />
                    <label htmlFor="disableCopy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none cursor-pointer">
                        {t("metadataAdvanced.disableCopy")}
                    </label>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                    {t("metadataAdvanced.disableCopyTip")}
                </div>
            </div>

            <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" htmlFor="metadata-json-text">{t("metadataAdvanced.jsonMode")}</label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setJsonMode(!jsonMode)}>
                        {jsonMode ? t("metadataAdvanced.jsonClose") : t("metadataAdvanced.jsonOpen")}
                    </Button>
                </div>
                {jsonMode && (
                        <div className="mt-2 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <Textarea
                            id="metadata-json-text"
                            name="metadataJsonText"
                            aria-label="JSON 內容"
                            value={jsonText}
                            onChange={(e) => setJsonText(e.target.value)}
                            className="font-mono text-xs h-64"
                        />
                        {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
                        <Button type="button" size="sm" onClick={applyJson}>{t("metadataAdvanced.jsonApply")}</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
