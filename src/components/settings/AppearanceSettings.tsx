import React, { useState } from "react";
import { Sun, Moon, Check, Type, Monitor, BookOpen, Columns3 } from "lucide-react";
import { Slider } from "../ui/slider";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { useSettings } from "../../contexts/SettingsContext";
import { useI18n } from "../../contexts/I18nContext";
import { cn } from "../../lib/utils";
import { READING_FONT_OPTIONS, UI_FONT_OPTIONS, resolveReadingFontStack } from "../../constants/readingFonts";
import { SettingsSectionCard } from "./SettingsSectionCard";
import { SettingRow } from "./SettingRow";
import { useIsMobileViewport } from "@write/script-reader-renderer";

interface AppearanceSettingsProps {
  sectionRef?: React.Ref<HTMLDivElement>;
}

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function AppearanceSettings({ sectionRef }: AppearanceSettingsProps): React.JSX.Element {
  const { t } = useI18n();
  const {
    isDark, setTheme, accent, accentOptions, setAccent, accentThemes,
    fontSize, setFontSize,
    bodyFontSize, setBodyFontSize,
    dialogueFontSize, setDialogueFontSize,
    lineHeight, setLineHeight,
    desktopUiScale, setDesktopUiScale,
    readingFontFamily, setReadingFontFamily,
    uiFontFamily, setUiFontFamily,
    showMarkers, setShowMarkers,
    showLineUnderline, setShowLineUnderline,
    usePresentationRenderer, setUsePresentationRenderer,
    presentationLayoutConfig,
  } = useSettings();

  const isMobileViewport = useIsMobileViewport();

  // showLineUnderline is supported only in the columns presentation mode and in
  // the legacy/render-block renderer branches.
  // Effective mode accounts for mobile auto-linear: when the viewport is narrow,
  // ScriptPresentationRenderer (mode="auto") switches to linear regardless of
  // presentationLayoutConfig.renderMode. In that case the setting has no effect.
  const effectivePresentationMode = isMobileViewport ? "linear" : presentationLayoutConfig.renderMode;
  const lineGuideSupported = !usePresentationRenderer || effectivePresentationMode === "columns";

  const [showAdvancedFont, setShowAdvancedFont] = useState(false);

  const setReadingSize = (value: number) => {
    const next = clampNumber(Number(value), 8, 72);
    setBodyFontSize(next);
    setDialogueFontSize(next);
    setFontSize(next);
  };
  const setBodyReadingSize = (value: number) => setBodyFontSize(clampNumber(Number(value), 8, 72));
  const setDialogueReadingSize = (value: number) => setDialogueFontSize(clampNumber(Number(value), 8, 72));
  const setReadingLineHeight = (value: number) => setLineHeight(Number(clampNumber(Number(value), 0.9, 2.4).toFixed(2)));

  const fontPresets = [
    { label: "XS", value: 10 },
    { label: "S", value: 14 },
    { label: "M", value: 18 },
    { label: "L", value: 28 },
    { label: "XXL", value: 48 },
  ];

  const lineHeightOptions = [
    { label: t("appearance.compact"), value: 1.05 },
    { label: t("appearance.standard"), value: 1.5 },
    { label: t("appearance.relaxed"), value: 2.1 },
  ];
  const desktopScaleOptions = [
    { label: "75%", value: 0.75 },
    { label: "90%", value: 0.9 },
    { label: "100%", value: 1 },
    { label: "125%", value: 1.25 },
    { label: "150%", value: 1.5 },
  ];
  const readingFontStack = resolveReadingFontStack(readingFontFamily);

  return (
    <div ref={sectionRef} className="space-y-5">
      {/* ── 1. 閱讀文字 — Typography ──────────────────────────────────────── */}
      <SettingsSectionCard
        icon={<Type className="w-4 h-4" />}
        title={t("appearance.readingText")}
        description={t("appearance.readingTextDesc")}
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="divide-y divide-border/40">
            <SettingRow label={t("appearance.fontFamily")}>
              <Select value={readingFontFamily} onValueChange={setReadingFontFamily}>
                <SelectTrigger className="h-9 w-full bg-background/70 sm:w-56">
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
            </SettingRow>

            <SettingRow label={t("appearance.fontSize")}>
              <div className="grid w-full grid-cols-5 gap-1 rounded-lg border border-border/40 bg-muted/30 p-1 sm:w-64">
                {fontPresets.map((opt) => {
                  const isActive = bodyFontSize === opt.value && dialogueFontSize === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setReadingSize(opt.value)}
                      className={cn(
                        "py-1.5 text-xs font-medium rounded-md transition-all",
                        isActive ? "bg-background shadow-sm text-primary font-bold" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </SettingRow>

            <SettingRow label={t("appearance.lineHeight")}>
              <div className="flex w-full items-center gap-1 rounded-lg border border-border/40 bg-muted/30 p-1 sm:w-64">
                {lineHeightOptions.map((opt) => {
                  const isActive = Math.abs(lineHeight - opt.value) < 0.1;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setReadingLineHeight(opt.value)}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                        isActive ? "bg-background shadow-sm text-primary font-bold" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </SettingRow>

            <div className="space-y-3 pt-3.5">
              <button
                type="button"
                onClick={() => setShowAdvancedFont(!showAdvancedFont)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvancedFont ? t("appearance.simple") : t("appearance.advanced")}
              </button>

              {showAdvancedFont && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-in fade-in slide-in-from-top-1">
                  <div className="space-y-1.5">
                    <div className="flex justify-between px-1">
                      <span className="text-[10px] text-muted-foreground">{t("appearance.body")}: {bodyFontSize}px</span>
                      <Input
                        type="number"
                        value={bodyFontSize}
                        onChange={(event) => setBodyReadingSize(Number(event.target.value))}
                        min={8}
                        max={72}
                        step={1}
                        className="h-6 w-16 px-2 text-[10px]"
                      />
                    </div>
                    <Slider
                      value={[bodyFontSize]}
                      onValueChange={([v]) => setBodyReadingSize(v)}
                      min={8}
                      max={72}
                      step={1}
                      className="py-1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between px-1">
                      <span className="text-[10px] text-muted-foreground">{t("appearance.dialogue")}: {dialogueFontSize}px</span>
                      <Input
                        type="number"
                        value={dialogueFontSize}
                        onChange={(event) => setDialogueReadingSize(Number(event.target.value))}
                        min={8}
                        max={72}
                        step={1}
                        className="h-6 w-16 px-2 text-[10px]"
                      />
                    </div>
                    <Slider
                      value={[dialogueFontSize]}
                      onValueChange={([v]) => setDialogueReadingSize(v)}
                      min={8}
                      max={72}
                      step={1}
                      className="py-1"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex justify-between px-1">
                      <span className="text-[10px] text-muted-foreground">{t("appearance.lineHeight")}: {lineHeight.toFixed(2)}</span>
                      <Input
                        type="number"
                        value={lineHeight}
                        onChange={(event) => setReadingLineHeight(Number(event.target.value))}
                        min={0.9}
                        max={2.4}
                        step={0.05}
                        className="h-6 w-16 px-2 text-[10px]"
                      />
                    </div>
                    <Slider
                      value={[lineHeight]}
                      onValueChange={([v]) => setReadingLineHeight(v)}
                      min={0.9}
                      max={2.4}
                      step={0.05}
                      className="py-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="xl:sticky xl:top-0 h-fit rounded-lg border border-border/60 bg-background/70 p-3">
            <div className="rounded-md border border-border/60 bg-background p-3" style={{ fontFamily: readingFontStack, lineHeight }}>
              <div className="text-xs font-semibold text-muted-foreground mb-1">{t("appearance.previewReading")}</div>
              <p style={{ fontSize: `${bodyFontSize}px` }}>
                {t("appearance.previewBody")}
              </p>
              <p className="mt-2 font-semibold" style={{ fontSize: `${dialogueFontSize}px` }}>
                {t("appearance.previewDialogue")}
              </p>
            </div>
          </div>
        </div>
      </SettingsSectionCard>

      {/* ── 2. 閱讀輔助 — Reading Guides ─────────────────────────────────── */}
      <SettingsSectionCard
        icon={<BookOpen className="w-4 h-4" />}
        title={t("appearance.readingGuides")}
        description={t("appearance.readingGuidesDesc")}
      >
        <div className="divide-y divide-border/40">
          <SettingRow label={t("appearance.showMarkers")}>
            <Switch checked={showMarkers} onCheckedChange={setShowMarkers} aria-label={t("appearance.showMarkers")} />
          </SettingRow>
          <SettingRow
            label={t("appearance.lineGuide")}
            description={lineGuideSupported ? undefined : t("appearance.lineGuideUnsupported")}
          >
            <Switch
              checked={lineGuideSupported && showLineUnderline}
              disabled={!lineGuideSupported}
              onCheckedChange={(value) => lineGuideSupported && setShowLineUnderline(value)}
              aria-label={t("appearance.lineGuide")}
            />
          </SettingRow>
        </div>
      </SettingsSectionCard>

      {/* ── 3. 多欄版面 — Presentation Layout ───────────────────────────── */}
      <SettingsSectionCard
        icon={<Columns3 className="w-4 h-4" />}
        title={t("appearance.presentationLayout")}
        description={t("appearance.presentationLayoutDesc")}
      >
        <SettingRow
          label={t("appearance.presentationLayoutEnabled")}
          description={t("appearance.presentationLayoutEnabledDesc")}
        >
          <Switch
            checked={usePresentationRenderer}
            onCheckedChange={setUsePresentationRenderer}
            aria-label={t("appearance.presentationLayoutEnabled")}
          />
        </SettingRow>
      </SettingsSectionCard>

      {/* ── 4. 介面外觀 — Interface Appearance ──────────────────────────── */}
      <SettingsSectionCard
        icon={<Monitor className="w-4 h-4" />}
        title={t("appearance.interfaceAppearance")}
        description={t("appearance.interfaceAppearanceDesc")}
      >
        <div className="divide-y divide-border/40">
          <SettingRow label={t("appearance.theme")} description={t("appearance.subtitle")}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/40 shrink-0">
                <button
                  type="button"
                  aria-pressed={!isDark}
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    !isDark ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sun className="w-3.5 h-3.5" /> {t("appearance.light")}
                </button>
                <button
                  type="button"
                  aria-pressed={isDark}
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    isDark ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Moon className="w-3.5 h-3.5" /> {t("appearance.dark")}
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {accentOptions.map((opt) => {
                  const active = accent === opt.value;
                  const swatch = accentThemes[opt.value as keyof typeof accentThemes]?.accent;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setAccent(opt.value as "emerald" | "indigo" | "amber")}
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
          </SettingRow>

          <SettingRow label={t("appearance.uiFont")}>
            <Select value={uiFontFamily} onValueChange={setUiFontFamily}>
              <SelectTrigger className="h-9 w-full bg-background/70 sm:w-56">
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
          </SettingRow>

          <SettingRow
            label={t("appearance.desktopScale")}
            description={t("appearance.desktopScaleDesc")}
            stacked
          >
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-1 rounded-lg border border-border/40 bg-background/70 p-1">
                {desktopScaleOptions.map((opt) => {
                  const active = Math.abs(Number(desktopUiScale || 1) - opt.value) < 0.01;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDesktopUiScale(opt.value)}
                      className={cn(
                        "rounded-md py-1.5 text-xs font-medium transition-all",
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
              <div className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-3">
                <Slider
                  value={[desktopUiScale]}
                  onValueChange={([v]) => setDesktopUiScale(v)}
                  min={0.75}
                  max={1.5}
                  step={0.01}
                />
                <Input
                  type="number"
                  value={desktopUiScale}
                  onChange={(event) => setDesktopUiScale(Number(event.target.value))}
                  min={0.75}
                  max={1.5}
                  step={0.01}
                  className="h-8 px-2 text-xs"
                />
              </div>
            </div>
          </SettingRow>
        </div>
      </SettingsSectionCard>
    </div>
  );
}
