import { useCallback } from "react";
import { buildV2TableExport, buildV2TableExportFromRenderedHtml } from "../../lib/v2/exportAdapter";
import type { OrchestratedDocument } from "../../lib/v2/types";
import type { MarkerConfig } from "../../types/script";
import { useScriptDownloadOptions } from "../shared/useScriptDownloadOptions";

interface RenderedHtmlRef {
  current: {
    processed?: string;
    raw?: string;
  };
}

interface UseLiveEditorDownloadOptionsParams {
  t: (key: string) => string;
  title: string;
  content: string;
  renderedHtmlRef: RenderedHtmlRef;
  ensureRenderedHtml?: () => Promise<string>;
  markerConfigs?: MarkerConfig[];
  orchestratedDoc?: OrchestratedDocument | null;
  isV2RendererEnabled?: boolean;
}

export function useLiveEditorDownloadOptions({
  t,
  title,
  content,
  renderedHtmlRef,
  ensureRenderedHtml,
  markerConfigs = [],
  orchestratedDoc,
  isV2RendererEnabled = false,
}: UseLiveEditorDownloadOptionsParams) {
  const getRenderedHtml = useCallback(async () => {
    let currentHtml = renderedHtmlRef.current.processed || renderedHtmlRef.current.raw;
    if (!currentHtml && ensureRenderedHtml) {
      currentHtml = await ensureRenderedHtml();
    }
    return currentHtml || "";
  }, [ensureRenderedHtml, renderedHtmlRef]);

  const resolveTableExport = useCallback(
    (renderedHtml: string) => (
      buildV2TableExportFromRenderedHtml(renderedHtml)
      || (orchestratedDoc ? buildV2TableExport(orchestratedDoc, markerConfigs) : null)
    ),
    [orchestratedDoc, markerConfigs]
  );

  return useScriptDownloadOptions({
    t,
    title,
    content,
    markerConfigs,
    getRenderedHtml,
    preferTableForGoogleDocs: !!orchestratedDoc,
    enableGoogleDocsTable: isV2RendererEnabled && !!orchestratedDoc,
    fallbackToClassicWhenTableMissing: !isV2RendererEnabled,
    showGoogleDocsTableOption: true,
    resolveTableExport,
  });
}
