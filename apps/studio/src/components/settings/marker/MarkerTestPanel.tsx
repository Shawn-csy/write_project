import React from "react";
import { Button } from "../../ui/button";
import { MarkerOutputPreview } from "./MarkerOutputPreview";
import { useI18n } from "../../../contexts/I18nContext";
import { findMarkerMatchLines, type MarkerMatchShape } from "../../../lib/markerMatchPreview";
import { MarkerPaneDivider } from "./layout/MarkerPaneDivider";
import { useMarkerRulePanes } from "./layout/useMarkerRulePanes";
import { getMarkerStudioSample, readMarkerStudioSample, storeMarkerStudioSample } from "./markerStudioSample";
import { readProductionWordRule, type ProductionMarkerMapping } from "../../../lib/productionScriptExport";
import type { MarkerConfig } from "../../../types/script";
import type { LayoutConfig } from "../../../lib/v2";


interface MarkerTestPanelProps {
  children?: React.ReactNode;
  markerConfigs: MarkerConfig[];
  selectedConfig: MarkerMatchShape | null;
  usePresentationRenderer?: boolean;
  layoutConfig?: LayoutConfig;
  mapping?: ProductionMarkerMapping;
}

export function MarkerTestPanel({ markerConfigs, selectedConfig, usePresentationRenderer = false, layoutConfig, mapping, children }: MarkerTestPanelProps): React.JSX.Element {
  const { t } = useI18n();
  const ruleId = selectedConfig?.id;
  const selectedRule = markerConfigs.find((rule) => rule.id === ruleId);
  const target = readProductionWordRule(selectedRule).target ?? (ruleId ? mapping?.[ruleId] : undefined);
  const sample = selectedConfig ? getMarkerStudioSample(selectedRule ?? selectedConfig, t, target) : "";
  const [customText, setCustomText] = React.useState<string | null>(() => readMarkerStudioSample(ruleId));
  const text = customText ?? sample;
  const showMismatch = customText !== null && Boolean(text.trim()) && Boolean(selectedConfig) &&
    selectedConfig?.matchMode !== "none" && selectedConfig?.matchMode !== "virtual" &&
    findMarkerMatchLines(text, selectedConfig).length === 0;
  const [proof, setProof] = React.useState(false);
  const sourceId = React.useId();
  const outputId = React.useId();
  const { workspace, ranges, resize, defaults } = useMarkerRulePanes();
  React.useEffect(() => {
    storeMarkerStudioSample(ruleId, customText);
  }, [ruleId, customText]);

  return (
    <div ref={workspace} className="marker-inspector" style={{ "--rule-preview-width": `${ranges.preview.value}px` } as React.CSSProperties}>
      <div className="marker-inspector-settings">{children}</div>
      <MarkerPaneDivider className="marker-inspector-divider" label={t("markerStudio.resizeRulePreview")}
        controls={outputId} direction={-1} range={ranges.preview}
        onResize={value => resize("preview", value)} onReset={() => resize("preview", defaults.preview)} />
      <div id={outputId} className="marker-inspector-preview">
      <section id={sourceId} className="overflow-hidden rounded-lg border border-border bg-background">
        <header className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-border px-3">
          <label className="text-sm font-semibold" htmlFor={`${sourceId}-input`}>
            {t("markerStudio.testInput", "試寫原稿")}
          </label>
          {customText !== null && sample && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setCustomText(null)}>
              {t("markerStudio.resetSample")}
            </Button>
          )}
        </header>
        <textarea id={`${sourceId}-input`}
          value={text}
          onChange={(event) => setCustomText(event.target.value)}
          aria-label={t("markerStudio.testInput", "試寫原稿")}
          placeholder={t("markerStudio.sourcePlaceholder")}
          rows={Math.min(6, Math.max(2, text.split("\n").length))}
          spellCheck={false}
          className="block w-full resize-y bg-muted/30 px-3 py-2 font-mono text-base leading-6 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring sm:text-sm"
        />
        {showMismatch && (
          <p role="status" className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
            {t("markerStudio.sampleNoMatch")}
          </p>
        )}
      </section>
      <section aria-label={t("markerStudio.previewMode")} className="grid min-w-0 gap-3">
        {(["word", "reader"] as const).map(mode => (
          <section key={mode} className="min-w-0 overflow-hidden rounded-lg border border-border" data-word-proof={mode === "word" && proof || undefined}>
            <header className="flex min-h-9 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1 text-xs">
              <h3 className="font-semibold">{t(mode === "word" ? "markerStudio.wordResult" : "markerStudio.readingPreview")}</h3>
              {mode === "word" && <label className="inline-flex items-center gap-1">
                <input type="checkbox" checked={proof} onChange={event => setProof(event.target.checked)} />
                {t("markerStudio.originalPaper")}
              </label>}
            </header>
            <MarkerOutputPreview mode={mode} text={text} markerConfigs={markerConfigs} mapping={mapping}
              layoutConfig={layoutConfig} usePresentationRenderer={usePresentationRenderer} />
          </section>
        ))}
      </section>
      </div>
    </div>
  );
}
