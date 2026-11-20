import { SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { useI18n } from "../../../contexts/I18nContext";
import {
  PRODUCTION_MARKER_TARGETS,
  inferProductionMarkerOutput,
  readProductionWordRule,
  type ProductionWordRule,
} from "../../../lib/productionScriptExport";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import type { EditableMarkerConfig, UpdateMarkerFn } from "./types";

export function MarkerWordTargetSelect({ label, target, autoRule, onChange, disabled, compact }: {
  label: string;
  autoRule?: Parameters<typeof inferProductionMarkerOutput>[0];
  target?: ProductionWordRule["target"];
  onChange: (target: NonNullable<ProductionWordRule["target"]>) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const inferred = autoRule && inferProductionMarkerOutput(autoRule);
  const autoDescription = inferred?.symbol ?? (inferred?.target ? t(`productionExport.${inferred.target}`) : "");
  return (
    <select
      aria-label={label}
      value={target ?? "auto"}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as NonNullable<ProductionWordRule["target"]>)}
      className={cn("max-w-full rounded-md px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", compact
        ? "h-7 w-fit cursor-pointer bg-transparent text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        : "h-9 border border-input bg-background text-sm text-foreground disabled:opacity-70")}
    >
      <option value="auto">{autoDescription
        ? t("markerStudio.wordInferred").replace("{output}", autoDescription)
        : t("productionExport.auto")}</option>
      {PRODUCTION_MARKER_TARGETS.map((option) => (
        <option key={option} value={option}>{t(`productionExport.${option}`)}</option>
      ))}
    </select>
  );
}

export function MarkerWordSettings({ config, idx, updateMarker, target }: {
  config: EditableMarkerConfig;
  idx: number;
  updateMarker: UpdateMarkerFn;
  target?: ProductionWordRule["target"];
}) {
  const { t } = useI18n();
  const styleId = useId();
  const [styleOpen, setStyleOpen] = useState(false);
  const word = readProductionWordRule(config);
  const raw = config.productionWord as ProductionWordRule | undefined;
  const effectiveTarget = word.target ?? target;
  const previewTarget = effectiveTarget && effectiveTarget !== "auto" ? effectiveTarget : inferProductionMarkerOutput(config).target;
  const templateColor = previewTarget === "effect" || previewTarget === "postEffect" ? "#808080"
    : previewTarget === "pause" ? "#7f7f7f" : "#000000";
  const update = (patch: Partial<ProductionWordRule>) => updateMarker(idx, "productionWord", {
    ...raw,
    ...patch,
  });
  const updateStyle = (patch: Partial<NonNullable<ProductionWordRule["style"]>>) =>
    update({ style: { ...raw?.style, ...patch } });

  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ms-auto">
        <MarkerWordTargetSelect label={t("markerStudio.wordCategory")} target={effectiveTarget}
          autoRule={config} onChange={(next) => update({ target: next })} />
        {effectiveTarget && effectiveTarget !== "auto" && effectiveTarget !== "preserve" && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {t("markerStudio.shortSymbol")}
            <Input className="h-9 w-20 font-mono text-foreground" maxLength={100} value={raw?.symbol ?? ""}
            aria-label={t("markerStudio.wordSymbol")} placeholder={effectiveTarget === "effect" ? "#SE" : effectiveTarget === "position" ? "@" : "…"}
            onChange={(event) => update({ symbol: event.target.value || undefined })} />
          </label>
        )}
        <Button type="button" variant={styleOpen ? "secondary" : "outline"} size="sm"
          aria-expanded={styleOpen} aria-controls={styleId} onClick={() => setStyleOpen(!styleOpen)}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t("markerStudio.wordStyle")}
        </Button>
      </div>
      <div id={styleId} hidden={!styleOpen} className="basis-full rounded-md border border-border bg-muted/40 px-3 py-2">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-28 flex-1 gap-1 text-sm">
            {t("markerStudio.wordFont")}
            <Input className="h-9" maxLength={100} placeholder="Calibri" value={raw?.style?.font ?? ""}
              onChange={(event) => updateStyle({ font: event.target.value || undefined })} />
          </label>
          <label className="grid gap-1 text-sm">
            {t("markerStudio.wordColor")}
            <Input type="color" className="h-9 w-14 px-1" value={word.style?.color ?? templateColor}
              onChange={(event) => updateStyle({ color: event.target.value })} />
          </label>
          {word.style?.color && (
            <button className="self-center text-xs text-muted-foreground underline" type="button" onClick={() => updateStyle({ color: undefined })}>
              {t("markerStudio.wordResetColor")}
            </button>
          )}
          <label className="grid gap-1 text-sm">
            {t("markerStudio.wordWeight")}
            <select
              value={word.style?.bold === undefined ? "" : String(word.style.bold)}
              onChange={(event) => updateStyle({ bold: event.target.value ? event.target.value === "true" : undefined })}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">{t("productionExport.auto")}</option>
              <option value="true">{t("markerStudio.wordBold")}</option>
              <option value="false">{t("markerStudio.wordRegular")}</option>
            </select>
          </label>
        </div>
      </div>
    </>
  );
}
