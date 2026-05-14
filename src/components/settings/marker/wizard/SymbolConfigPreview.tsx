import React from "react";
import { useI18n } from "../../../../contexts/I18nContext";
import type { WizardMarkerConfig } from "../../../../hooks/useStepSymbolConfigState";

interface Props {
    markerType: "single" | "range" | "inline" | null;
    config: WizardMarkerConfig;
}

export function SymbolConfigPreview({ markerType, config }: Props): React.JSX.Element {
    const { t } = useI18n();
    const isRange = markerType === "range";
    const isInline = markerType === "inline";

    return (
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-2">{t("stepSymbolConfig.previewTitle")}</p>
            <div className="font-mono text-sm bg-background/50 p-3 rounded border border-border/30">
                {isRange ? (
                    <div className="space-y-1">
                        <div className="text-primary">{config.start || ">>SE"} {config.label || t("stepSymbolConfig.rangeStart")}</div>
                        <div className="pl-4 border-l-2 border-primary/50 text-muted-foreground">{t("stepSymbolConfig.contentHere")}</div>
                        {config.pause && (
                            <>
                                <div className="text-[color:var(--license-term-fg)]">{config.pause} {config.pauseLabel || t("stepSymbolConfig.pause")}</div>
                                <div className="text-muted-foreground">{t("stepSymbolConfig.interruptedContent")}</div>
                                <div className="text-[color:var(--license-term-fg)]">{config.pause} {t("stepSymbolConfig.resume")}</div>
                                <div className="pl-4 border-l-2 border-primary/50 text-muted-foreground">{t("stepSymbolConfig.moreContent")}</div>
                            </>
                        )}
                        <div className="text-primary">{config.end || "<<SE"} {t("stepSymbolConfig.rangeEnd")}</div>
                    </div>
                ) : isInline ? (
                    <div>
                        <span className="text-muted-foreground">{t("stepSymbolConfig.characterName")} </span>
                        <span className="text-primary">
                            {config.start || "("}{config.label || "V.O."}{config.end || ")"}
                        </span>
                    </div>
                ) : (
                    <div className="text-primary">
                        {config.start || "#SE"} {config.label || t("stepSymbolConfig.sfxDescription")}
                        {config.end && <span> {config.end}</span>}
                    </div>
                )}
            </div>
        </div>
    );
}
