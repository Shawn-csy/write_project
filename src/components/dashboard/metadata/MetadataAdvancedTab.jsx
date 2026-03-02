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
    applyJson,
    layout = "stack"
}) {
    const { t } = useI18n();
    const containerClass = layout === "grid-3"
        ? "mt-0 grid gap-3 md:grid-cols-3"
        : "space-y-4 mt-0";
    const panelClass = "rounded-xl border border-border/70 bg-background p-3 shadow-sm";
    return (
        <div className={containerClass}>
            <div className={panelClass}>
                <div className="grid gap-3">
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
                    <div className="inline-flex w-fit gap-1 rounded-md border bg-background p-1">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={`h-8 px-3 text-xs ${showMarkerLegend ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : "border-border bg-background text-muted-foreground"}`}
                            onClick={() => setShowMarkerLegend(true)}
                        >
                            顯示圖例
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={`h-8 px-3 text-xs ${!showMarkerLegend ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : "border-border bg-background text-muted-foreground"}`}
                            onClick={() => setShowMarkerLegend(false)}
                        >
                            隱藏圖例
                        </Button>
                    </div>
                </div>
            </div>

            <div className={panelClass}>
                <div className="grid gap-3">
                    <label className="text-sm font-medium">{t("metadataAdvanced.contentProtection")}</label>
                    <div className="inline-flex w-fit gap-1 rounded-md border bg-background p-1">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={`h-8 px-3 text-xs ${disableCopy ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : "border-border bg-background text-muted-foreground"}`}
                            onClick={() => setDisableCopy(true)}
                        >
                            {t("metadataAdvanced.disableCopy")}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={`h-8 px-3 text-xs ${!disableCopy ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : "border-border bg-background text-muted-foreground"}`}
                            onClick={() => setDisableCopy(false)}
                        >
                            允許複製
                        </Button>
                    </div>
                </div>
            </div>

            <div className={panelClass}>
                <div className="flex h-full items-center justify-between gap-2">
                    <label className="text-sm font-medium">{t("metadataAdvanced.jsonMode")}</label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setJsonMode(!jsonMode)}>
                        {jsonMode ? t("metadataAdvanced.jsonClose") : t("metadataAdvanced.jsonOpen")}
                    </Button>
                </div>
            </div>

            {jsonMode && (
                <div className={layout === "grid-3" ? "md:col-span-3 space-y-2 animate-in fade-in zoom-in-95 duration-200" : "space-y-2 animate-in fade-in zoom-in-95 duration-200"}>
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
    );
}
