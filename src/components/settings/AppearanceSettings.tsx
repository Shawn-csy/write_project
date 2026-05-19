import React, { useState } from "react";
import { Sun, Moon, Palette, Check, AlignJustify, Type, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Separator } from "../ui/separator";
import { Slider } from "../ui/slider";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useSettings } from "../../contexts/SettingsContext";
import { useI18n } from "../../contexts/I18nContext";
import { cn } from "../../lib/utils";
import { PublisherFormRow } from "../dashboard/publisher/PublisherFormRow";
import { READING_FONT_OPTIONS, UI_FONT_OPTIONS, resolveReadingFontStack } from "../../constants/readingFonts";

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
    showLineUnderline, setShowLineUnderline,
  } = useSettings();

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
      <Card className="border border-border/60 bg-card/50 shadow-sm">
        <CardHeader className="pb-3 px-5 pt-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base">{t("appearance.readingAppearance")}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{t("appearance.readingAppearanceDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <PublisherFormRow
                label={t("appearance.typography")}
                className="md:grid-cols-[160px_minmax(0,1fr)]"
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground ml-1">{t("appearance.fontSize")}</span>
                      <div className="grid grid-cols-5 gap-1 bg-muted/30 p-1 rounded-lg border border-border/40">
                        {fontPresets.map((opt) => {
                          const isActive = bodyFontSize === opt.value && dialogueFontSize === opt.value;
                          return (
                            <button
                              key={opt.value}
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
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground ml-1">{t("appearance.lineHeight")}</span>
                      <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/40">
                        {lineHeightOptions.map((opt) => {
                          const isActive = Math.abs(lineHeight - opt.value) < 0.1;
                          return (
                            <button
                              key={opt.value}
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
                    </div>
                  </div>

                  <button
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
              </PublisherFormRow>

              <Separator className="bg-border/40" />

              <PublisherFormRow
                label={t("appearance.display")}
                className="md:grid-cols-[160px_minmax(0,1fr)]"
              >
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
                  <div className={cn("w-8 h-4 rounded-full relative transition-colors", showLineUnderline ? "bg-primary" : "bg-muted-foreground/30")}>
                    <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200", showLineUnderline ? "left-[18px]" : "left-0.5")} />
                  </div>
                </button>
              </PublisherFormRow>
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
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/50 shadow-sm">
        <CardHeader className="pb-3 px-5 pt-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base">{t("appearance.interfaceAppearance")}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{t("appearance.interfaceAppearanceDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5 space-y-5">
          <PublisherFormRow
            label={t("appearance.theme")}
            hint={t("appearance.subtitle")}
            className="md:grid-cols-[160px_minmax(0,1fr)]"
          >
            <div className="flex flex-wrap items-center gap-4">
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

              <div className="flex items-center gap-1.5 flex-wrap">
                {accentOptions.map((opt) => {
                  const active = accent === opt.value;
                  const swatch = accentThemes[opt.value as keyof typeof accentThemes]?.accent;
                  return (
                    <button
                      key={opt.value}
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
          </PublisherFormRow>

          <Separator className="bg-border/40" />

          <PublisherFormRow
            label={t("appearance.uiFont")}
            className="md:grid-cols-[160px_minmax(0,1fr)]"
          >
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
          </PublisherFormRow>

          <Separator className="bg-border/40" />

          <PublisherFormRow
            label={t("appearance.desktopScale")}
            hint={t("appearance.desktopScaleDesc")}
            className="md:grid-cols-[160px_minmax(0,1fr)]"
          >
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-1 rounded-lg border border-border/40 bg-background/70 p-1">
                {desktopScaleOptions.map((opt) => {
                  const active = Math.abs(Number(desktopUiScale || 1) - opt.value) < 0.01;
                  return (
                    <button
                      key={opt.label}
                      type="button"
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
          </PublisherFormRow>
        </CardContent>
      </Card>
    </div>
  );
}
