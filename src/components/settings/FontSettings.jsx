import React, { useState } from "react";
import { useSettings } from "../../contexts/SettingsContext";

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
    { label: "中", value: 18 },
    { label: "大", value: 24 },
    { label: "特大", value: 36 },
  ];
  const detailOptions = [12, 14, 16, 18, 24, 32, 36];
  const [showDetailSizes, setShowDetailSizes] = useState(false);

  const renderSizeButtons = (current, onSelect, options = detailOptions) => (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map((size) => {
        const active = current === size;
        return (
          <button
            key={size}
            aria-label={`字級 ${size}px`}
            onClick={() => onSelect(size)}
            className={`h-10 px-3 inline-flex items-center justify-center rounded border ${
              active ? "border-foreground font-semibold bg-accent/10" : "border-border/70"
            } text-foreground/80 hover:text-foreground transition-colors`}
          >
            <span style={{ fontSize: size <= 16 ? 12 : size >= 24 ? 18 : 14 }}>A</span>
            <span className="ml-2 text-sm">{size}px</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">快速字級</p>
            <p className="text-xs text-muted-foreground">套用到正文與對白</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unifiedPresets.map((opt) => {
            const active =
              bodyFontSize === opt.value && dialogueFontSize === opt.value;
            return (
              <button
                key={opt.value}
                className={`h-9 px-3 rounded-lg border text-xs ${
                  active
                    ? "border-foreground font-semibold bg-accent/10"
                    : "border-border/70 text-foreground/80"
                } hover:text-foreground transition-colors`}
                onClick={() => {
                  setBodyFontSize(opt.value);
                  setDialogueFontSize(opt.value);
                  setFontSize(opt.value);
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <button
            className="text-xs text-foreground/80 hover:text-foreground underline underline-offset-4"
            onClick={() => setShowDetailSizes((v) => !v)}
          >
            {showDetailSizes ? "收合字級設定" : "展開個別字級"}
          </button>
        </div>
        {showDetailSizes && (
          <>
            <div className="border-t border-border/70 my-2" />
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">全文字級</p>
                <p className="text-xs text-muted-foreground">影響正文/標題顯示</p>
              </div>
            </div>
            {renderSizeButtons(bodyFontSize, setBodyFontSize)}
            <p className="text-xs text-muted-foreground">
              預覽：<span style={{ fontSize: `${bodyFontSize}px` }}>這是正文示範字級</span>
            </p>
            <div className="border-t border-border/70 my-3" />
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">對白字級</p>
                <p className="text-xs text-muted-foreground">只影響對白/括號</p>
              </div>
            </div>
            {renderSizeButtons(dialogueFontSize, setDialogueFontSize)}
            <p className="text-xs text-muted-foreground">
              預覽：<span style={{ fontSize: `${dialogueFontSize}px`, fontStyle: "italic" }}>（這是對白示範字級）</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
