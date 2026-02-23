import React, { useState } from "react";
import { MarkerGeneralSettings } from "../settings/marker/configs/MarkerGeneralSettings";
import { MarkerLogicSettings } from "../settings/marker/configs/MarkerLogicSettings";
import { MarkerStyleSettings } from "../settings/marker/configs/MarkerStyleSettings";
import ScriptViewer from "../renderer/ScriptViewer"; // Assuming this path, check later
import { useI18n } from "../../contexts/I18nContext";

export function MarkerSettingsGuide() {
    const { t } = useI18n();
    // Dummy state for the interactive guide
    const [demoConfig, setDemoConfig] = useState({
        id: "demo-marker",
        label: "sample-marker",
        type: "inline",
        priority: 10,
        matchMode: "enclosure",
        start: "{",
        end: "}",
        style: {
            color: "var(--marker-color-red)",
            fontWeight: "bold"
        },
        renderer: {
            template: ""
        }
    });

    // Mock update function
    const updateMarker = (_, field, value) => {
        setDemoConfig(prev => {
            if (typeof field === 'object') {
                return { ...prev, ...field };
            }
            return { ...prev, [field]: value };
        });
    };

    return (
        <div className="space-y-8">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 text-sm text-muted-foreground">
                <p>
                    {t("markerSettingsGuide.introPrefix")} <strong>{t("markerSettingsGuide.introStrong")}</strong>{t("markerSettingsGuide.introSuffix")}
                </p>
            </div>

            {/* Section 1: General */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                     <h3 className="text-base font-semibold">{t("markerSettingsGuide.section1Title")}</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 border rounded-lg p-4 bg-background/50">
                        <MarkerGeneralSettings 
                            config={demoConfig} 
                            idx={0} 
                            updateMarker={updateMarker}
                            setExpandedId={() => {}} // No-op
                        />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-2 lg:pt-2">
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>{t("markerSettingsGuide.nameLabel")}</strong>：{t("markerSettingsGuide.nameDesc")}</li>
                            <li><strong>{t("markerSettingsGuide.codeLabel")}</strong>：{t("markerSettingsGuide.codeDesc")}</li>
                            <li><strong>{t("markerSettingsGuide.typeLabel")}</strong>：
                                <ul className="pl-4 mt-1 space-y-1 opacity-80">
                                    <li><code>Inline</code>: {t("markerSettingsGuide.typeInlineDesc")}</li>
                                    <li><code>Block</code>: {t("markerSettingsGuide.typeBlockDesc")}</li>
                                    <li><code>Dual</code>: {t("markerSettingsGuide.typeDualDesc")}</li>
                                </ul>
                            </li>
                            <li><strong>{t("markerSettingsGuide.priorityLabel")}</strong>：{t("markerSettingsGuide.priorityDesc")}</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Section 2: Logic */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                     <h3 className="text-base font-semibold">{t("markerSettingsGuide.section2Title")}</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 border rounded-lg p-4 bg-background/50">
                        <MarkerLogicSettings 
                            config={demoConfig} 
                            idx={0} 
                            updateMarker={updateMarker}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-2 lg:pt-2">
                        <p className="font-semibold text-foreground">{t("markerSettingsGuide.modeLabel")}</p>
                        <ul className="list-disc pl-4 space-y-1 mb-3">
                            <li><strong>{t("markerSettingsGuide.modeEnclosure")}</strong>: {t("markerSettingsGuide.modeEnclosureDesc")} <code>{`{...}`}</code>。</li>
                            <li><strong>{t("markerSettingsGuide.modePrefix")}</strong>: {t("markerSettingsGuide.modePrefixDesc")} <code>{`> ...`}</code>。</li>
                            <li><strong>{t("markerSettingsGuide.modeRegex")}</strong>: {t("markerSettingsGuide.modeRegexDesc")}</li>
                        </ul>
                         <p className="font-semibold text-foreground">{t("markerSettingsGuide.advancedLabel")}</p>
                         <ul className="list-disc pl-4 space-y-1">
                            <li><strong>{t("markerSettingsGuide.displayTemplateLabel")}</strong>: {t("markerSettingsGuide.displayTemplateDesc1")}
                                <br/>{t("markerSettingsGuide.displayTemplateDesc2")} <code>{`{{content}}`}</code> {t("markerSettingsGuide.displayTemplateDesc3")}
                                <br/>{t("markerSettingsGuide.displayTemplateExample")} <code>[{t("markerSettingsGuide.exampleLabel")}: {`{{content}}`}]</code>，{t("markerSettingsGuide.displayTemplateInput")} <code>{`{${t("markerSettingsGuide.exampleContent")}}`}</code> {t("markerSettingsGuide.displayTemplateResult")} <code>[{t("markerSettingsGuide.exampleLabel")}: {t("markerSettingsGuide.exampleContent")}]</code>。
                            </li>
                         </ul>
                    </div>
                </div>
            </div>

            {/* Section 3: Style */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                     <h3 className="text-base font-semibold">{t("markerSettingsGuide.section3Title")}</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <div className="lg:col-span-2 border rounded-lg p-4 bg-background/50">
                        <MarkerStyleSettings 
                            config={demoConfig} 
                            idx={0} 
                            updateMarker={updateMarker}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-2 lg:pt-2">
                        <p>{t("markerSettingsGuide.styleEditorLabel")}</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>{t("markerSettingsGuide.fontStyleLabel")}</strong>：{t("markerSettingsGuide.fontStyleDesc")}</li>
                            <li><strong>{t("markerSettingsGuide.alignLabel")}</strong>：{t("markerSettingsGuide.alignDesc")}</li>
                            <li><strong>{t("markerSettingsGuide.colorLabel")}</strong>：{t("markerSettingsGuide.colorDesc")}</li>
                            <li><strong>{t("markerSettingsGuide.fontSizeLabel")}</strong>：{t("markerSettingsGuide.fontSizeDesc")}</li>
                        </ul>
                    </div>
                </div>
            </div>

             {/* Live Preview of the Dummy Marker */}
            <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">{t("markerSettingsGuide.currentPreview")}</h4>
                <div className="flex items-center justify-center p-6 bg-background rounded border border-dashed">
                     <span 
                        style={{
                            color: demoConfig.style?.color,
                            backgroundColor: demoConfig.style?.backgroundColor,
                            fontWeight: demoConfig.style?.fontWeight,
                            fontStyle: demoConfig.style?.fontStyle,
                            textDecoration: demoConfig.style?.textDecoration,
                            fontSize: demoConfig.style?.fontSize,
                            opacity: demoConfig.style?.opacity,
                        }}
                     >
                        {demoConfig.start}{t("markerSettingsGuide.sampleText")}{demoConfig.end}
                     </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    {t("markerSettingsGuide.previewNote")}
                </p>
            </div>
        </div>
    );
}
