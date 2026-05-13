import React, { useState } from "react";
import {
  Sun, Moon, Palette, Check, AlignJustify
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Separator } from "../ui/separator";
import { Slider } from "../ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useSettings } from "../../contexts/SettingsContext";
import { useI18n } from "../../contexts/I18nContext";
import { cn } from "../../lib/utils";
import { PublisherFormRow } from "../dashboard/publisher/PublisherFormRow";
import { READING_FONT_OPTIONS, UI_FONT_OPTIONS, resolveReadingFontStack } from "../../constants/readingFonts";

export function AppearanceSettings({ sectionRef }) {
  const { t } = useI18n();
  const {
      // Theme
      isDark, setTheme, accent, accentOptions, setAccent, accentThemes,
      // Font
      fontSize, setFontSize,
      bodyFontSize, setBodyFontSize,
      dialogueFontSize, setDialogueFontSize,
      lineHeight, setLineHeight,
      desktopUiScale, setDesktopUiScale,
      readingFontFamily, setReadingFontFamily,
      uiFontFamily, setUiFontFamily,
      // Display
      showLineUnderline, setShowLineUnderline
  } = useSettings();

  const [showAdvancedFont, setShowAdvancedFont] = useState(false);

  // Helper for quick font presets
  const fontPresets = [
    { label: "S", value: 14 },
    { label: "M", value: 16 },
    { label: "L", value: 18 },
    { label: "XL", value: 24 },
  ];

  const lineHeightOptions = [
    { label: t("appearance.compact"), value: 1.2 },
    { label: t("appearance.standard"), value: 1.5 },
    { label: t("appearance.relaxed"), value: 1.8 },
  ];
  const desktopScaleOptions = [
    { label: "100%", value: 1 },
    { label: "110%", value: 1.1 },
    { label: "120%", value: 1.2 },
  ];
  const readingFontStack = resolveReadingFontStack(readingFontFamily);

  return (
    <Card className="border border-border/60 bg-card/50 shadow-sm" ref={sectionRef}>
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center gap-2">
           <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Palette className="w-4 h-4" />
           </div>
           <div>
             <CardTitle className="text-base">{t("appearance.title")}</CardTitle>
             <CardDescription className="text-xs mt-0.5">{t("appearance.subtitle")}</CardDescription>
           </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-5 pb-5 space-y-6">
        
        {/* 1. Theme & Accent - Compact Row */}
        <PublisherFormRow
            label={t("appearance.theme")}
            hint={t("appearance.subtitle")}
            className="md:grid-cols-[180px_minmax(0,1fr)]"
        >
            <div className="flex flex-wrap items-center gap-4">
                {/* Dark Mode Toggle */}
                <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/40 shrink-0">
                    <button
                        onClick={() => setTheme("light")}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            !isDark ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Sun className="w-3.5 h-3.5" /> {t("appearance.light")}
                    </button>
                    <button
                         onClick={() => setTheme("dark")}
                         className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            isDark ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Moon className="w-3.5 h-3.5" /> {t("appearance.dark")}
                    </button>
                </div>

                <div className="h-6 w-px bg-border/60 mx-1" />

                {/* Accent Swatches */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {accentOptions.map((opt) => {
                        const active = accent === opt.value;
                        const swatch = accentThemes[opt.value]?.accent;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => setAccent(opt.value)}
                                className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center transition-all ring-offset-2 ring-offset-card",
                                    active ? "ring-2 ring-primary scale-110" : "hover:scale-110 opacity-70 hover:opacity-100"
                                )}
                                style={{ backgroundColor: swatch ? `hsl(${swatch})` : undefined }}
                                title={opt.label}
                            >
                                {active && <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </PublisherFormRow>

        <Separator className="bg-border/40" />

        {/* 2. Typography - Compact Grid */}
        <PublisherFormRow
            label={t("appearance.typography")}
            className="md:grid-cols-[180px_minmax(0,1fr)]"
        >
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                <div className="flex gap-2">
                   <button 
                      onClick={() => setShowAdvancedFont(!showAdvancedFont)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                   >
                     {showAdvancedFont ? t("appearance.simple") : t("appearance.advanced")}
                   </button>
                </div>
               </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1.5 sm:col-span-2">
                     <span className="text-xs text-muted-foreground ml-1">{t("appearance.fontFamily")}</span>
                     <Select value={readingFontFamily} onValueChange={setReadingFontFamily}>
                        <SelectTrigger className="h-9 bg-background/70">
                          <SelectValue placeholder={t("appearance.fontFamily")} />
                        </SelectTrigger>
                        <SelectContent>
                          {READING_FONT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                     </Select>
                 </div>
                 {/* Font Size Group */}
                 <div className="space-y-1.5">
                     <span className="text-xs text-muted-foreground ml-1">{t("appearance.fontSize")}</span>
                     <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/40">
                         {fontPresets.map((opt) => {
                             const isActive = bodyFontSize === opt.value;
                             return (
                                 <button
                                     key={opt.value}
                                     onClick={() => {
                                         setBodyFontSize(opt.value);
                                         setDialogueFontSize(opt.value);
                                         setFontSize(opt.value);
                                     }}
                                     className={cn(
                                         "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                         isActive ? "bg-background shadow-sm text-primary font-bold" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                     )}
                                 >
                                     {opt.label}
                                 </button>
                             )
                         })}
                     </div>
                 </div>

                 {/* Line Height Group */}
                 <div className="space-y-1.5">
                     <span className="text-xs text-muted-foreground ml-1">{t("appearance.lineHeight")}</span>
                     <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/40">
                         {lineHeightOptions.map((opt) => {
                             const isActive = Math.abs(lineHeight - opt.value) < 0.1;
                             return (
                                 <button
                                     key={opt.value}
                                     onClick={() => setLineHeight(opt.value)}
                                     className={cn(
                                         "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                          isActive ? "bg-background shadow-sm text-primary font-bold" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                     )}
                                 >
                                     {opt.label}
                                 </button>
                             )
                         })}
                     </div>
                 </div>
             </div>

             {/* Advanced Font Controls */}
             {showAdvancedFont && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-1">
                   <div className="space-y-1.5">
                       <div className="flex justify-between px-1">
                          <span className="text-[10px] text-muted-foreground">{t("appearance.body")}: {bodyFontSize}px</span>
                       </div>
                       <Slider 
                          value={[bodyFontSize]} 
                          onValueChange={([v]) => setBodyFontSize(v)} 
                          min={12} max={36} step={2} 
                          className="py-1"
                       />
                   </div>
                   <div className="space-y-1.5">
                       <div className="flex justify-between px-1">
                          <span className="text-[10px] text-muted-foreground">{t("appearance.dialogue")}: {dialogueFontSize}px</span>
                       </div>
                       <Slider 
                          value={[dialogueFontSize]} 
                          onValueChange={([v]) => setDialogueFontSize(v)} 
                          min={12} max={36} step={2} 
                          className="py-1"
                       />
                   </div>
                </div>
             )}
             </div>
        </PublisherFormRow>

        <Separator className="bg-border/40" />

        <PublisherFormRow
            label={t("appearance.previewTitle")}
            className="md:grid-cols-[180px_minmax(0,1fr)]"
        >
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                <div className="rounded-md border border-border/60 bg-background p-3" style={{ fontFamily: readingFontStack, lineHeight }}>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">{t("appearance.previewReading")}</div>
                    <p className="text-[13px]" style={{ fontSize: `${bodyFontSize}px` }}>
                        {t("appearance.previewBody")}
                    </p>
                    <p className="mt-2 font-semibold" style={{ fontSize: `${dialogueFontSize}px` }}>
                        {t("appearance.previewDialogue")}
                    </p>
                </div>
            </div>
        </PublisherFormRow>

        <Separator className="bg-border/40" />

        {/* 3. Display Options */}
        <PublisherFormRow
            label={t("appearance.display")}
            className="md:grid-cols-[180px_minmax(0,1fr)]"
        >
            <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="mb-2 text-xs font-medium text-foreground/90">{t("appearance.uiFont")}</div>
                <Select value={uiFontFamily} onValueChange={setUiFontFamily}>
                    <SelectTrigger className="h-9 bg-background/70">
                      <SelectValue placeholder={t("appearance.uiFont")} />
                    </SelectTrigger>
                    <SelectContent>
                      {UI_FONT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="mb-2 text-xs font-medium text-foreground/90">{t("appearance.desktopScale")}</div>
                <div className="mb-2 text-[11px] text-muted-foreground">{t("appearance.desktopScaleDesc")}</div>
                <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-background/70 p-1">
                    {desktopScaleOptions.map((opt) => {
                        const active = Math.abs(Number(desktopUiScale || 1) - opt.value) < 0.01;
                        return (
                            <button
                                key={opt.label}
                                type="button"
                                onClick={() => setDesktopUiScale(opt.value)}
                                className={cn(
                                    "flex-1 rounded-md py-1.5 text-xs font-medium transition-all",
                                    active
                                        ? "bg-background text-primary shadow-sm ring-1 ring-border/60"
                                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                                )}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    onClick={() => setShowLineUnderline(!showLineUnderline)}
                    className={cn(
                        "flex items-center justify-between p-3 rounded-lg border text-xs font-medium transition-all group",
                        showLineUnderline 
                          ? "bg-primary/5 border-primary/40 text-primary" 
                          : "bg-background border-border/60 text-muted-foreground hover:border-border hover:bg-muted/10"
                    )}
                >
                    <span className="flex items-center gap-2">
                        <AlignJustify className="w-4 h-4 opacity-70" />
                        {t("appearance.lineGuide")}
                    </span>
                    <div className={cn(
                        "w-8 h-4 rounded-full relative transition-colors",
                         showLineUnderline ? "bg-primary" : "bg-muted-foreground/30"
                    )}>
                        <div className={cn(
                            "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200",
                            showLineUnderline ? "left-[18px]" : "left-0.5"
                        )} />
                    </div>
                </button>
            </div>
            </div>
        </PublisherFormRow>

      </CardContent>
    </Card>
  );
}
