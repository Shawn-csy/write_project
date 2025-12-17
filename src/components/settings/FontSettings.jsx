import React, { useState } from "react";
import { CaseSensitive, Check } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { cn } from "../../lib/utils";

export function FontSettings() {
  const {
    fontSize,
    setFontSize,
    bodyFontSize,
    setBodyFontSize,
    dialogueFontSize,
    setDialogueFontSize,
  } = useSettings();

  const unifiedPresets = [
    { label: "更小", value: 12 },
    { label: "小", value: 14 },
    { label: "預設", value: 16 },
    { label: "中", value: 18 },
    { label: "大", value: 24 },
    { label: "特大", value: 36 },
  ];
  const detailOptions = [12, 14, 16, 18, 20, 24, 28, 32, 36];
  const [showDetailSizes, setShowDetailSizes] = useState(false);

  const renderSizeButtons = (current, onSelect) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      {detailOptions.map((size) => {
        const active = current === size;
        return (
          <button
            key={size}
            aria-label={`字級 ${size}px`}
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
           <p className="text-base font-semibold text-foreground">字體大小</p>
           <p className="text-xs text-muted-foreground">調整閱讀時的舒適度</p>
         </div>
      </div>

      {/* Quick Presets */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground/90">快速設定</label>
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
                <span className="text-xs font-medium">{opt.label}</span>
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
            {showDetailSizes ? "收合進階設定" : "顯示進階微調"}
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
                 <label className="text-sm font-medium">正文大小</label>
                 <span className="text-xs text-muted-foreground">{bodyFontSize}px</span>
              </div>
              {renderSizeButtons(bodyFontSize, setBodyFontSize)}
            </div>
            
            <div className="space-y-2">
               <div className="flex justify-between items-center">
                 <label className="text-sm font-medium">對白大小</label>
                 <span className="text-xs text-muted-foreground">{dialogueFontSize}px</span>
              </div>
              {renderSizeButtons(dialogueFontSize, setDialogueFontSize)}
            </div>
        </div>
      </div>
    </div>
  );
}
