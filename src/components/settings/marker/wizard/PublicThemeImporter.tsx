import React from "react";
import { cn } from "../../../../lib/utils";
import { Input } from "../../../ui/input";
import { useI18n } from "../../../../contexts/I18nContext";
import type { MarkerConfig } from "../../../../types/script";

interface PublicThemeItem {
    id: string;
    name?: string;
    configs?: MarkerConfig[];
}

interface Props {
    showPublicImport: boolean;
    setShowPublicImport: (v: boolean) => void;
    publicThemes: unknown[];
    publicLoading: boolean;
    publicError: string;
    publicQuery: string;
    setPublicQuery: (v: string) => void;
    filteredPublicThemes: PublicThemeItem[];
    selectedThemeId: string;
    setSelectedThemeId: (v: string) => void;
    filteredThemeMarkers: MarkerConfig[];
    selectedPublicMarkerId: string;
    setSelectedPublicMarkerId: (v: string) => void;
    selectedPublicMarker: MarkerConfig | null;
    copyMode: "all" | "logic" | "style";
    setCopyMode: (v: "all" | "logic" | "style") => void;
    loadPublicMarkerThemes: () => void;
    buildSampleFromPublicMarker: (marker: MarkerConfig | null) => string;
    setSampleText: (v: string) => void;
    applyPublicMarkerToDraft: () => void;
}

export function PublicThemeImporter({
    showPublicImport, setShowPublicImport,
    publicThemes, publicLoading, publicError,
    publicQuery, setPublicQuery,
    filteredPublicThemes, selectedThemeId, setSelectedThemeId,
    filteredThemeMarkers, selectedPublicMarkerId, setSelectedPublicMarkerId,
    selectedPublicMarker, copyMode, setCopyMode,
    loadPublicMarkerThemes, buildSampleFromPublicMarker, setSampleText, applyPublicMarkerToDraft,
}: Props): React.JSX.Element {
    const { t } = useI18n();

    return (
        <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-medium">{t("stepSymbolConfig.importFromPublicTitle")}</h4>
                    <p className="text-[11px] text-muted-foreground">{t("stepSymbolConfig.importFromPublicTip")}</p>
                </div>
                <button
                    type="button"
                    className="rounded border border-input bg-background px-2 py-1 text-xs hover:bg-muted"
                    onClick={() => setShowPublicImport(!showPublicImport)}
                >
                    {showPublicImport ? t("stepSymbolConfig.collapseAdvanced") : t("stepSymbolConfig.expandAdvanced")}
                </button>
            </div>

            {showPublicImport && (
                <>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="rounded border border-input bg-background px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                            onClick={loadPublicMarkerThemes}
                            disabled={publicLoading}
                        >
                            {publicLoading ? t("stepSymbolConfig.loading") : t("stepSymbolConfig.loadPublicThemes")}
                        </button>
                    </div>

                    {publicError && <p className="text-xs text-destructive">{publicError}</p>}

                    {publicThemes.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div className="space-y-1 sm:col-span-2">
                                <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.searchPublicThemeOrMarker")}</label>
                                <Input
                                    value={publicQuery}
                                    onChange={(e) => setPublicQuery(e.target.value)}
                                    placeholder={t("stepSymbolConfig.searchPlaceholder")}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.publicTheme")}</label>
                                <select
                                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                                    value={selectedThemeId}
                                    onChange={(e) => setSelectedThemeId(e.target.value)}
                                >
                                    {filteredPublicThemes.map((theme) => (
                                        <option key={theme.id} value={theme.id}>{theme.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.markerInTheme")}</label>
                                <select
                                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                                    value={selectedPublicMarkerId}
                                    onChange={(e) => setSelectedPublicMarkerId(e.target.value)}
                                >
                                    {filteredThemeMarkers.map((marker, index) => {
                                        const itemValue = marker.id || marker.label || `marker-${index}`;
                                        return (
                                            <option key={itemValue} value={itemValue}>
                                                {marker.label || marker.id || t("stepSymbolConfig.markerWithIndex").replace("{index}", String(index + 1))}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                    )}

                    {selectedPublicMarker && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                className="rounded border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/15"
                                onClick={() => setSampleText(buildSampleFromPublicMarker(selectedPublicMarker))}
                            >
                                {t("stepSymbolConfig.applyToSample")}
                            </button>
                            <button
                                type="button"
                                className="rounded border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/15"
                                onClick={applyPublicMarkerToDraft}
                            >
                                {t("stepSymbolConfig.applyToDraft")}
                            </button>
                            <div className="inline-flex rounded-md border border-input overflow-hidden">
                                {(["all", "logic", "style"] as const).map((mode, i) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        className={cn(
                                            "px-2 py-1 text-xs",
                                            i > 0 && "border-l border-input",
                                            copyMode === mode ? "bg-muted text-foreground" : "bg-background text-muted-foreground hover:bg-muted/40"
                                        )}
                                        onClick={() => setCopyMode(mode)}
                                    >
                                        {t(`stepSymbolConfig.copyMode${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
            {!showPublicImport && (
                <p className="text-xs text-muted-foreground">{t("stepSymbolConfig.publicImportCollapsedTip")}</p>
            )}
        </div>
    );
}
