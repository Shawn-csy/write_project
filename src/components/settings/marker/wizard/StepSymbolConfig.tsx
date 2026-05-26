import React from 'react';
import { cn } from '../../../../lib/utils';
import { Input } from '../../../ui/input';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useI18n } from "../../../../contexts/I18nContext";
import { useStepSymbolConfigState } from "../../../../hooks/useStepSymbolConfigState";
import { SymbolConfigPreview } from "./SymbolConfigPreview";
import { PublicThemeImporter } from "./PublicThemeImporter";
import { evaluateMarkerSampleMatch } from "./evaluateMarkerSampleMatch";
export { evaluateMarkerSampleMatch } from "./evaluateMarkerSampleMatch";
import type { MarkerConfig } from "../../../../types/script";

type MarkerType = "single" | "range" | "inline" | null;
export type WizardMarkerConfig = MarkerConfig & {
    pause?: string;
    pauseLabel?: string;
    keywords?: string[];
    dimIfNotKeyword?: boolean;
    showDelimiters?: boolean;
};

interface StepSymbolConfigProps {
    markerType: MarkerType;
    config: WizardMarkerConfig;
    onChange: (config: WizardMarkerConfig) => void;
}

export function StepSymbolConfig({ markerType, config, onChange }: StepSymbolConfigProps): React.JSX.Element {
    const { t } = useI18n();
    const s = useStepSymbolConfigState({ config, onChange, t });

    const isRange = markerType === "range";
    const isInline = markerType === "inline";
    const isSingle = markerType === "single";

    const hasStartSymbol = config.start && config.start.trim() !== "";
    const hasEndSymbol = config.end && config.end.trim() !== "";
    const hasLabel = config.label && config.label.trim() !== "";

    const sampleResult = evaluateMarkerSampleMatch({
        markerType, config, sampleText: s.sampleText,
        i18n: {
            enterTestText: t("stepSymbolConfig.reasonEnterTestText"),
            setStartSymbol: t("stepSymbolConfig.reasonSetStartSymbol"),
            prefixMatched: t("stepSymbolConfig.reasonPrefixMatched"),
            prefixNotFound: t("stepSymbolConfig.reasonPrefixNotFound"),
            needsEndSymbol: t("stepSymbolConfig.reasonNeedsEndSymbol"),
            pairMatched: t("stepSymbolConfig.reasonPairMatched"),
            pairNotFound: t("stepSymbolConfig.reasonPairNotFound"),
            unsupportedMode: t("stepSymbolConfig.reasonUnsupportedMode"),
        },
    });

    return (
        <div className="space-y-6">
            <SymbolConfigPreview markerType={markerType} config={config} />

            {/* 基本資訊 */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">{t("stepSymbolConfig.basicInfo")}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                        <label className="text-xs text-muted-foreground">
                            {t("stepSymbolConfig.markerName")} <span className="text-destructive">*</span>
                        </label>
                        <Input
                            value={config.label || ""}
                            onChange={(e) => s.updateField("label", e.target.value)}
                            placeholder={t("stepSymbolConfig.markerNamePlaceholder")}
                            className={cn("h-9", !hasLabel && "border-destructive/60 focus-visible:ring-destructive")}
                        />
                    </div>
                </div>
            </div>

            {/* 符號設定 */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    {t("stepSymbolConfig.symbolConfig")}
                    <span className="text-[10px] text-muted-foreground font-normal">{t("stepSymbolConfig.fullWidthSupported")}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                            {isRange ? t("stepSymbolConfig.startSymbol") : isInline ? t("stepSymbolConfig.leftBracket") : t("stepSymbolConfig.prefixSymbol")}
                            <span className="text-destructive">*</span>
                        </label>
                        <Input
                            value={config.start || ""}
                            onChange={(e) => s.updateField("start", e.target.value)}
                            placeholder={isRange ? ">>SE" : isInline ? "(" : "#SE"}
                            className={cn("h-9 font-mono text-center", !hasStartSymbol && "border-destructive/60 focus-visible:ring-destructive")}
                        />
                    </div>

                    {(isRange || isInline || (isSingle && config.matchMode === "enclosure")) && (
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                                {isRange ? t("stepSymbolConfig.endSymbol") : t("stepSymbolConfig.rightBracket")}
                                <span className="text-destructive">*</span>
                            </label>
                            <Input
                                value={config.end || ""}
                                onChange={(e) => s.updateField("end", e.target.value)}
                                placeholder={isRange ? "<<SE" : ")"}
                                className={cn("h-9 font-mono text-center", !hasEndSymbol && "border-destructive/60 focus-visible:ring-destructive")}
                            />
                        </div>
                    )}

                    {isSingle && config.matchMode !== "enclosure" && (
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                                {t("stepSymbolConfig.endSymbol")} <span className="text-muted-foreground/50">{t("stepSymbolConfig.optional")}</span>
                            </label>
                            <Input
                                value={config.end || ""}
                                onChange={(e) => {
                                    s.updateField("end", e.target.value);
                                    s.updateField("matchMode", e.target.value ? "enclosure" : "prefix");
                                }}
                                placeholder={t("stepSymbolConfig.emptyAsPrefix")}
                                className="h-9 font-mono text-center border-dashed"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 區間模式 - 暫停設定 */}
            {isRange && (
                <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: "var(--license-filter-border)", backgroundColor: "var(--license-filter-bg)" }}>
                    <h4 className="text-sm font-medium flex items-center gap-2 text-[color:var(--license-term-fg)]">
                        <Info className="w-3.5 h-3.5" />
                        {t("stepSymbolConfig.pauseFeature")}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">{t("stepSymbolConfig.pauseFeatureTip")}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.pauseSymbol")}</label>
                            <Input value={config.pause || ""} onChange={(e) => s.updateField("pause", e.target.value)} placeholder="><SE" className="h-9 font-mono text-center border-dashed" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.displayText")}</label>
                            <Input value={config.pauseLabel !== undefined ? config.pauseLabel : ""} onChange={(e) => s.updateField("pauseLabel", e.target.value)} placeholder={t("stepSymbolConfig.leaveEmptyToHide")} className="h-9 text-center border-dashed" />
                        </div>
                    </div>
                </div>
            )}

            {/* 行內模式 - 關鍵字設定 */}
            {isInline && (
                <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
                        <Info className="w-3.5 h-3.5" />
                        {t("stepSymbolConfig.keywordFilter")}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">{t("stepSymbolConfig.keywordFilterTip")}</p>
                    <div className="space-y-2">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.keywordList")}</label>
                            <Input
                                value={config.keywords?.join(", ") || ""}
                                onChange={(e) => s.updateField("keywords", e.target.value.split(",").map(str => str.trim()).filter(Boolean))}
                                placeholder={t("stepSymbolConfig.keywordPlaceholder")}
                                className="h-9 text-xs"
                            />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={!!config.dimIfNotKeyword} onChange={(e) => s.updateField("dimIfNotKeyword", e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-ring" />
                            <span className="text-xs text-muted-foreground">{t("stepSymbolConfig.dimIfNotKeyword")}</span>
                        </label>
                    </div>
                </div>
            )}

            {/* 驗證提示 */}
            {(!hasLabel || !hasStartSymbol || (isRange && !hasEndSymbol)) && (
                <div className="flex items-center gap-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{t("stepSymbolConfig.fillRequiredFields")}</span>
                </div>
            )}

            {/* 即時符號測試 */}
            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{t("stepSymbolConfig.liveMatchTest")}</h4>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]", sampleResult.matched ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        {sampleResult.matched ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {sampleResult.matched ? t("stepSymbolConfig.matched") : t("stepSymbolConfig.notMatched")}
                    </span>
                </div>
                <textarea
                    value={s.sampleText}
                    onChange={(e) => s.setSampleText(e.target.value)}
                    placeholder={isRange ? t("stepSymbolConfig.samplePlaceholderRange") : isInline ? t("stepSymbolConfig.samplePlaceholderInline") : t("stepSymbolConfig.samplePlaceholderSingle")}
                    className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <p className={cn("text-xs", sampleResult.matched ? "text-primary" : "text-muted-foreground")}>{sampleResult.reason}</p>
            </div>

            <PublicThemeImporter
                showPublicImport={s.showPublicImport}
                setShowPublicImport={s.setShowPublicImport}
                publicThemes={s.publicThemes}
                publicLoading={s.publicLoading}
                publicError={s.publicError}
                publicQuery={s.publicQuery}
                setPublicQuery={s.setPublicQuery}
                filteredPublicThemes={s.filteredPublicThemes}
                selectedThemeId={s.selectedThemeId}
                setSelectedThemeId={s.setSelectedThemeId}
                filteredThemeMarkers={s.filteredThemeMarkers}
                selectedPublicMarkerId={s.selectedPublicMarkerId}
                setSelectedPublicMarkerId={s.setSelectedPublicMarkerId}
                selectedPublicMarker={s.selectedPublicMarker}
                copyMode={s.copyMode}
                setCopyMode={s.setCopyMode}
                loadPublicMarkerThemes={s.loadPublicMarkerThemes}
                buildSampleFromPublicMarker={s.buildSampleFromPublicMarker}
                setSampleText={s.setSampleText}
                applyPublicMarkerToDraft={s.applyPublicMarkerToDraft}
            />
        </div>
    );
}
