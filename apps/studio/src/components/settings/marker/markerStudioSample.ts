import { buildMarkerSample, type MarkerMatchShape } from "../../../lib/markerMatchPreview";
import { inferProductionMarkerOutput, type ProductionMarkerSyntax, type ProductionWordRule } from "../../../lib/productionScriptExport";

const SAMPLE_STORAGE_KEY = "marker-test-panel-text-v2";

export function readMarkerStudioSample(id: string | undefined): string | null {
  try {
    return window.sessionStorage.getItem(id ? `${SAMPLE_STORAGE_KEY}:${id}` : SAMPLE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeMarkerStudioSample(id: string | undefined, text: string | null) {
  const key = id ? `${SAMPLE_STORAGE_KEY}:${id}` : SAMPLE_STORAGE_KEY;
  try {
    if (text === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, text);
  } catch {
    // The current preview still works when session storage is unavailable.
  }
}

export function getMarkerStudioSample(
  rule: MarkerMatchShape & ProductionMarkerSyntax,
  t: (key: string) => string,
  target?: ProductionWordRule["target"],
): string {
  const inferred = inferProductionMarkerOutput(rule).target;
  const sampleTarget = target && target !== "auto" && target !== "preserve" ? target : inferred;
  const example = sampleTarget && sampleTarget !== "auto" && sampleTarget !== "preserve" ? sampleTarget
    : rule.start === "【" ? "postEffect"
    : rule.v2EventKind === "bgm" ? "background"
    : rule.matchMode === "range" ? "continuousEffect"
    : rule.matchMode === "enclosure" ? "performance"
    : "effect";
  if (rule.matchMode === "none") return t("markerStudio.sample.dialogue");
  return buildMarkerSample(rule, {
    content: t(`markerStudio.sample.${example}`),
    before: t("markerStudio.sample.before"),
    after: t("markerStudio.sample.after"),
    rangeBody: t("markerStudio.sample.dialogue"),
    rangePause: t("markerStudio.sample.rangePause"),
  });
}
