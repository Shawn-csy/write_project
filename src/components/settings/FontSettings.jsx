import React, { useState } from "react";
import { CaseSensitive } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { cn } from "../../lib/utils";
import { useI18n } from "../../contexts/I18nContext";

export function FontSettings() {
  const { t } = useI18n();
  const {
    fontSize,
    setFontSize,
    bodyFontSize,
    setBodyFontSize,
    dialogueFontSize,
    setDialogueFontSize,
    lineHeight,
    setLineHeight,
  } = useSettings();

  const unifiedPresets = [
    { labelKey: "fontSettings.presetSmaller", value: 12 },
    { labelKey: "fontSettings.presetSmall", value: 14 },
    { labelKey: "fontSettings.presetDefault", value: 16 },
    { labelKey: "fontSettings.presetMedium", value: 18 },
    { labelKey: "fontSettings.presetLarge", value: 24 },
    { labelKey: "fontSettings.presetXLarge", value: 36 },
  ];
  const detailOptions = [12, 14, 16, 18, 20, 24, 28, 32, 36];
  const lineHeightOptions = [
    { labelKey: "fontSettings.lineHeightVeryTight", value: 1.0 },
    { labelKey: "fontSettings.lineHeightTighter", value: 1.1 },
    { labelKey: "fontSettings.lineHeightCompact", value: 1.2 },
    { labelKey: "fontSettings.lineHeightSlightTight", value: 1.3 },
    { labelKey: "fontSettings.lineHeightStandard", value: 1.4 },
    { labelKey: "fontSettings.lineHeightComfort", value: 1.5 },
    { labelKey: "fontSettings.lineHeightRelaxed", value: 1.6 },
    { labelKey: "fontSettings.lineHeightWide", value: 1.8 },
  ];
  const [showDetailSizes, setShowDetailSizes] = useState(false);

  const renderSizeButtons = (current, onSelect) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      {detailOptions.map((size) => {
        const active = current === size;
        return (
          <button
            key={size}
            aria-label={t("fontSettings.fontSizeAria").replace("{size}", String(size))}
            onClick={() => onSelect(size)}
            className={cn(
              "h-8 px-2.5 min-w-[2.5rem] inline-flex items-center justify-center rounded-md border text-xs transition-all duration-200",
              active
                ? "border-primary/50 bg-primary/10 text-primary font-bold shadow-sm"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/30"
            )}
          >
             {size}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
         <div className="p-2 rounded-md bg-primary/10 text-primary">
            <CaseSensitive className="w-4 h-4" />
         </div>
         <div>
           <p className="text-base font-semibold text-foreground">{t("fontSettings.title")}</p>
           <p className="text-xs text-muted-foreground">{t("fontSettings.subtitle")}</p>
         </div>
      </div>

      {/* Quick Presets */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground/90">{t("fontSettings.quickPresets")}</label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {unifiedPresets.map((opt) => {
            const active = bodyFontSize === opt.value && dialogueFontSize === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setBodyFontSize(opt.value);
                  setDialogueFontSize(opt.value);
                  setFontSize(opt.value);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 rounded-lg border transition-all duration-200",
                  active
                    ? "border-primary/50 bg-primary/5 text-primary ring-1 ring-primary/20"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <span className="text-xs font-medium">{t(opt.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Line Height */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-foreground/90">{t("fontSettings.lineHeight")}</label>
          <span className="text-xs text-muted-foreground">{lineHeight}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {lineHeightOptions.map((opt) => {
            const active = Math.abs(lineHeight - opt.value) < 0.05;
            return (
              <button
                key={opt.value}
                onClick={() => setLineHeight(opt.value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 rounded-lg border transition-all duration-200",
                  active
                    ? "border-primary/50 bg-primary/5 text-primary ring-1 ring-primary/20"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <span className="text-xs font-medium">{t(opt.labelKey)}</span>
                <span className="text-[10px] text-muted-foreground">{opt.value}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Toggle */}
      <div className="pt-2">
         <button
            className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            onClick={() => setShowDetailSizes((v) => !v)}
          >
            <span className={cn("transition-transform duration-200", showDetailSizes ? "rotate-90" : "")}>▶</span>
            {showDetailSizes ? t("fontSettings.hideAdvanced") : t("fontSettings.showAdvanced")}
          </button>
      </div>
      
      {/* Detailed Settings */}
      <div className={cn(
          "grid transition-all duration-300 ease-in-out pl-4 border-l-2 border-border/30 gap-5 overflow-hidden",
          showDetailSizes ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0 mt-0"
      )}>
        <div className="min-h-0 space-y-5 py-1">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                 <label className="text-sm font-medium">{t("fontSettings.bodyFontSize")}</label>
                 <span className="text-xs text-muted-foreground">{bodyFontSize}px</span>
              </div>
              {renderSizeButtons(bodyFontSize, setBodyFontSize)}
            </div>
            
            <div className="space-y-2">
               <div className="flex justify-between items-center">
                 <label className="text-sm font-medium">{t("fontSettings.dialogueFontSize")}</label>
                 <span className="text-xs text-muted-foreground">{dialogueFontSize}px</span>
              </div>
              {renderSizeButtons(dialogueFontSize, setDialogueFontSize)}
            </div>
        </div>
      </div>
    </div>
  );
}
