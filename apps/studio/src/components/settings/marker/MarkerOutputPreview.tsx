import { useMemo } from "react";
import ScriptViewer from "../../renderer/ScriptViewer";
import { useI18n } from "../../../contexts/I18nContext";
import { buildProductionScriptExport, type ProductionMarkerMapping } from "../../../lib/productionScriptExport";
import type { LayoutConfig } from "../../../lib/v2";
import type { MarkerConfig } from "../../../types/script";
import { MarkerWordPreview } from "./MarkerWordPreview";
import type { MarkerPreviewMode } from "./MarkerPreviewSwitch";
import { previewMarkerConfigs } from "./markerPreviewColors";

interface OutputProps {
  mode: MarkerPreviewMode;
  text: string;
  markerConfigs: MarkerConfig[];
  mapping?: ProductionMarkerMapping;
  layoutConfig?: LayoutConfig;
  usePresentationRenderer?: boolean;
  compact?: boolean;
}

export function MarkerOutputPreview({ mode, text, markerConfigs, mapping, layoutConfig, usePresentationRenderer, compact }: OutputProps) {
  const { t } = useI18n();
  const document = useMemo(() => mode === "word" && text.trim()
    ? buildProductionScriptExport(text, {}, markerConfigs, mapping) : null, [mode, text, markerConfigs, mapping]);
  const readerRules = useMemo(() => mode === "reader" ? previewMarkerConfigs(markerConfigs) : [], [mode, markerConfigs]);
  return (
    <div className="marker-preview-surface" data-mode={mode} data-compact={compact || undefined}
      data-testid={compact ? `marker-table-${mode}-preview` : `marker-test-${mode}-preview`}>
      {!text.trim() || (document && !document.chapters.length)
        ? <p className="text-sm text-muted-foreground">{t(compact ? "markerStudio.noSample" : "markerStudio.emptyResult")}</p>
        : document ? <MarkerWordPreview document={document} compact={compact} />
        : <ScriptViewer text={text} markerConfigs={readerRules} usePresentationRenderer={usePresentationRenderer}
            presentationLayoutConfig={layoutConfig} fontSize={14} />}
    </div>
  );
}
