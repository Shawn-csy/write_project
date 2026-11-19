import { useCallback, useMemo } from "react";
import { buildExportMetadata, type ExportMetadataSource } from "../../lib/exportMetadata";
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
  isPresentationRendererEnabled?: boolean;
  metadataSource?: ExportMetadataSource | null;
}

export function useLiveEditorDownloadOptions({
  t,
  title,
  content,
  renderedHtmlRef,
  ensureRenderedHtml,
  markerConfigs = [],
  orchestratedDoc,
  isPresentationRendererEnabled = false,
  metadataSource,
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

  const exportMetadata = useMemo(
    () => buildExportMetadata(metadataSource || { title }, title),
    [metadataSource, title]
  );

  return useScriptDownloadOptions({
    t,
    title,
    content,
    markerConfigs,
    getRenderedHtml,
    preferTableForGoogleDocs: !!orchestratedDoc,
    enableGoogleDocsTable: isPresentationRendererEnabled && !!orchestratedDoc,
    fallbackToClassicWhenTableMissing: true,
    showGoogleDocsTableOption: true,
    exportMetadata,
    pdfCoverUrl: metadataSource?.coverUrl,
    resolveTableExport,
  });
}
