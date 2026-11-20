import { useMemo } from "react";
import { parseScreenplay } from "@write/script-engine";
import {
  applyDisplayTemplate, applyMarkerSemanticRoutes, buildPresentationDocumentFromAst,
  normalizeLayoutConfig, orchestrateDocument, PresentationEventText, type LayoutConfig,
} from "@write/script-reader-renderer";
import { useI18n } from "../../../contexts/I18nContext";
import type { MarkerConfig } from "../../../types/script";
import { previewMarkerConfigs } from "./markerPreviewColors";

export function MarkerReadingExcerpt({ text, configs, layout }: {
  text: string;
  configs: MarkerConfig[];
  layout?: LayoutConfig;
}) {
  const { t } = useI18n();
  const rules = useMemo(() => previewMarkerConfigs(configs), [configs]);
  const excerpt = useMemo(() => {
    const { ast } = parseScreenplay(text, rules);
    const layoutConfig = applyMarkerSemanticRoutes(normalizeLayoutConfig(layout), rules);
    const document = buildPresentationDocumentFromAst(ast, { layoutConfig, markerConfigs: rules });
    const routed = orchestrateDocument(document);
    const events = [...routed.lanes.flatMap(lane => lane.events.map(event => ({
      event, track: layoutConfig.tracks.find(track => track.id === lane.trackId)?.name,
    }))), ...routed.unassignedEvents.map(event => ({ event, track: undefined }))];
    events.sort((a, b) => a.event.lineSpan.start - b.event.lineSpan.start);
    return events;
  }, [text, rules, layout]);
  const first = excerpt[0];
  if (!first) return <span className="text-muted-foreground">{text.trim() ? t("markerStudio.noReaderEvent") : "—"}</span>;
  const rule = rules.find(rule => rule.id === first.event.markerId);
  return <span className="block truncate">
    {first.track && <span className="me-1.5 border-e border-border pe-1.5 text-xs text-muted-foreground">{first.track}</span>}
    <span style={rule?.style}><PresentationEventText text={applyDisplayTemplate(first.event.text, rule)} markerConfigs={rules} /></span>
    {excerpt.length > 1 && " …"}
  </span>;
}
