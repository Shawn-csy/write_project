import React, { useId, useMemo, useState } from "react";
import { Sun, Moon, ChevronRight, Check, Tag } from "lucide-react";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { useSettings } from "../../contexts/SettingsContext";
import { useI18n } from "../../contexts/I18nContext";
import { cn } from "../../lib/utils";
import { READING_FONT_OPTIONS, UI_FONT_OPTIONS } from "../../constants/readingFonts";
import { SettingsSectionCard } from "./SettingsSectionCard";
import "./settingsAppearance.css";
import { SettingRow } from "./SettingRow";
import {
  normalizeLayoutConfig, SCRIPT_PRESENTATION_RENDERER_CAPABILITY, useIsMobileViewport,
} from "@write/script-reader-renderer";
import ScriptViewer from "../renderer/ScriptViewer";

interface AppearanceSettingsProps {
  sectionRef?: React.Ref<HTMLDivElement>;
}

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function AppearanceSettings({ sectionRef }: AppearanceSettingsProps): React.JSX.Element {
  const { t } = useI18n();
  const {
    isDark, setTheme, accent, accentOptions, setAccent, accentThemes,
    setFontSize,
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

  const effectivePresentationMode = isMobileViewport ? "linear" : normalizeLayoutConfig(presentationLayoutConfig).renderMode;
  const lineGuideSupported = !usePresentationRenderer
    || SCRIPT_PRESENTATION_RENDERER_CAPABILITY.showLineUnderline[effectivePresentationMode] === "supported";

  const lineGuideReasonId = useId();

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
  const previewBody = t("appearance.previewBody");
  const previewDialogue = t("appearance.previewDialogue");
  const previewCue = t("appearance.previewCue");
  const previewMarkerLabel = t("appearance.previewMarkerLabel");
  const previewMarkerConfigs = useMemo(() => [{
    id: "appearance-preview-cue",
    label: previewMarkerLabel,
    type: "inline",
    matchMode: "enclosure",
    start: "(",
    end: ")",
    style: { color: "hsl(var(--primary))", fontStyle: "italic" },
    renderer: { template: "({{content}})" },
  }], [previewMarkerLabel]);
  const previewAst = useMemo(() => ({
    children: [
      { type: "action", text: previewBody, lineStart: 1, lineEnd: 1 },
      { type: "dialogue", text: `(${previewCue}) ${previewDialogue}`, lineStart: 2, lineEnd: 2 },
    ],
  }), [previewBody, previewCue, previewDialogue]);


  const sizeIsCustom = !fontPresets.some(({ value }) => bodyFontSize === value && dialogueFontSize === value);
  const lineHeightIsCustom = !lineHeightOptions.some(({ value }) => lineHeight === value);
  const scaleIsCustom = !desktopScaleOptions.some(({ value }) => desktopUiScale === value);

  return (
    <div ref={sectionRef} className="settings-appearance space-y-4">
      <SettingsSectionCard title={t("appearance.readingText")} contentClassName="px-0">
        <div className="settings-reading-grid">
          <div className="settings-reading-typography settings-appearance-rows">
            <SettingRow label={t("appearance.fontFamily")}>
              <Select value={readingFontFamily} onValueChange={setReadingFontFamily}>
                <SelectTrigger aria-label={t("appearance.fontFamily")} className="settings-appearance-control">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {READING_FONT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              label={t("appearance.fontSize")}
              description={sizeIsCustom && (bodyFontSize === dialogueFontSize
                ? `${bodyFontSize}px`
                : `${t("appearance.body")} ${bodyFontSize}px · ${t("appearance.dialogue")} ${dialogueFontSize}px`)}
            >
              <AppearancePresets
                label={t("appearance.fontSize")}
                options={fontPresets}
                isSelected={(value) => bodyFontSize === value && dialogueFontSize === value}
                onSelect={setReadingSize}
              />
            </SettingRow>
            <SettingRow label={t("appearance.lineHeight")} description={lineHeightIsCustom && lineHeight.toFixed(2)}>
              <AppearancePresets
                label={t("appearance.lineHeight")}
                options={lineHeightOptions}
                isSelected={(value) => lineHeight === value}
                onSelect={setReadingLineHeight}
              />
            </SettingRow>
            <details>
              <summary className="settings-appearance-disclosure">
                <ChevronRight aria-hidden="true" className="size-3.5" />
                {t("appearance.advanced")}
              </summary>
              <div className="settings-appearance-rows">
                <NumberSetting
                  label={t("appearance.bodyFontSize")}
                  value={bodyFontSize}
                  onChange={setBodyReadingSize}
                  min={8}
                  max={72}
                  step={1}
                />
                <NumberSetting
                  label={t("appearance.dialogueFontSize")}
                  value={dialogueFontSize}
                  onChange={setDialogueReadingSize}
                  min={8}
                  max={72}
                  step={1}
                />
                <NumberSetting
                  label={t("appearance.lineHeight")}
                  value={lineHeight}
                  onChange={setReadingLineHeight}
                  min={0.9}
                  max={2.4}
                  step={0.05}
                />
              </div>
            </details>
          </div>

          <figure className="settings-reading-preview m-0 min-w-0">
            <figcaption className="mb-3 text-xs font-medium text-muted-foreground">{t("appearance.previewReading")}</figcaption>
            <div className="settings-reading-sample">
              <ScriptViewer
                text={`${previewBody}\n(${previewCue}) ${previewDialogue}`}
                externalAst={previewAst}
                markerConfigs={previewMarkerConfigs}
                bodyFontSize={bodyFontSize}
                dialogueFontSize={dialogueFontSize}
                readingFontFamily={readingFontFamily}
                lineHeight={lineHeight}
                showMarkers={showMarkers}
                showLineUnderline={lineGuideSupported && showLineUnderline}
                usePresentationRenderer={usePresentationRenderer}
                presentationLayoutConfig={presentationLayoutConfig}
              />
              {showMarkers && (
                <div className="settings-reading-marker-hint">
                  <Tag aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>{t("appearance.showMarkers")} · {previewMarkerLabel}</span>
                </div>
              )}
            </div>
          </figure>

          <div className="settings-reading-options settings-appearance-rows">
            <SettingRow label={t("appearance.showMarkers")}>
              <Switch checked={showMarkers} onCheckedChange={setShowMarkers} aria-label={t("appearance.showMarkers")} />
            </SettingRow>
            <SettingRow label={t("appearance.presentationLayoutEnabled")}>
              <Switch
                checked={usePresentationRenderer}
                onCheckedChange={setUsePresentationRenderer}
                aria-label={t("appearance.presentationLayoutEnabled")}
              />
            </SettingRow>
            <SettingRow
              label={t("appearance.lineGuide")}
              description={!lineGuideSupported && <span id={lineGuideReasonId}>{t("appearance.lineGuideUnsupported")}</span>}
            >
              <Switch
                checked={lineGuideSupported && showLineUnderline}
                disabled={!lineGuideSupported}
                onCheckedChange={(value) => lineGuideSupported && setShowLineUnderline(value)}
                aria-label={t("appearance.lineGuide")}
                aria-describedby={lineGuideSupported ? undefined : lineGuideReasonId}
              />
            </SettingRow>
          </div>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title={t("appearance.interfaceAppearance")}>
        <div className="settings-appearance-rows">
          <SettingRow label={t("appearance.theme")}>
            <div role="group" aria-label={t("appearance.theme")} className="settings-appearance-presets">
              <button type="button" aria-pressed={!isDark} onClick={() => setTheme("light")}>
                <Sun aria-hidden="true" className="size-3.5" />{t("appearance.light")}
              </button>
              <button type="button" aria-pressed={isDark} onClick={() => setTheme("dark")}>
                <Moon aria-hidden="true" className="size-3.5" />{t("appearance.dark")}
              </button>
            </div>
          </SettingRow>
          <SettingRow label={t("appearance.accentColor")}>
            <div role="group" aria-label={t("appearance.accentColor")} className="flex flex-wrap items-center gap-2">
              {accentOptions.map((opt) => {
                const active = accent === opt.value;
                const swatch = accentThemes[opt.value as keyof typeof accentThemes]?.accent;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-label={opt.label}
                    aria-pressed={active}
                    onClick={() => setAccent(opt.value as "emerald" | "indigo" | "amber")}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-card",
                      active ? "ring-2 ring-primary" : "opacity-75 hover:opacity-100"
                    )}
                    style={{ backgroundColor: swatch ? `hsl(${swatch})` : undefined }}
                    title={opt.label}
                  >
                    {active && <Check aria-hidden="true" className="size-3.5 text-white drop-shadow-md" />}
                  </button>
                );
              })}
            </div>
          </SettingRow>
          <SettingRow label={t("appearance.uiFont")}>
            <Select value={uiFontFamily} onValueChange={setUiFontFamily}>
              <SelectTrigger aria-label={t("appearance.uiFont")} className="settings-appearance-control">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UI_FONT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label={t("appearance.desktopScale")} description={scaleIsCustom && `${Math.round(desktopUiScale * 100)}%`}>
            <AppearancePresets
              label={t("appearance.desktopScale")}
              options={desktopScaleOptions}
              isSelected={(value) => desktopUiScale === value}
              onSelect={setDesktopUiScale}
            />
          </SettingRow>
          <details>
            <summary className="settings-appearance-disclosure">
              <ChevronRight aria-hidden="true" className="size-3.5" />
              {t("appearance.fineTuneScale")}
            </summary>
            <NumberSetting
              label={t("appearance.desktopScale")}
              value={desktopUiScale}
              onChange={setDesktopUiScale}
              min={0.75}
              max={1.5}
              step={0.01}
            />
          </details>
        </div>
      </SettingsSectionCard>
    </div>
  );
}

interface AppearancePresetsProps {
  label: string;
  options: { label: string; value: number }[];
  isSelected: (value: number) => boolean;
  onSelect: (value: number) => void;
}

function AppearancePresets({ label, options, isSelected, onSelect }: AppearancePresetsProps) {
  return (
    <div className="settings-appearance-control settings-appearance-presets" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={isSelected(option.value)}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface NumberSettingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}

function NumberSetting({ label, value, onChange, min, max, step }: NumberSettingProps) {
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <SettingRow label={<label htmlFor={inputId}>{label}</label>}>
      <div className="settings-appearance-control flex items-center gap-2">
        <input
          type="range"
          aria-label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            setDraft(null);
            onChange(event.currentTarget.valueAsNumber);
          }}
          className="min-w-0 flex-1 accent-primary"
        />
        <Input
          id={inputId}
          type="number"
          value={draft ?? value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const { value: text, valueAsNumber } = event.currentTarget;
            setDraft(text);
            if (valueAsNumber >= min && valueAsNumber <= max) onChange(valueAsNumber);
          }}
          onBlur={(event) => {
            setDraft(null);
            if (draft !== null && Number.isFinite(event.currentTarget.valueAsNumber)) {
              onChange(clampNumber(event.currentTarget.valueAsNumber, min, max));
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="h-8 w-[4.5rem] px-2 text-sm"
        />
      </div>
    </SettingRow>
  );
}
