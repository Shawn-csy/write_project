import { buildExportMetadataHtml, buildPrintHtml, getRenderedSnapshot } from "@write/reader-export";
import type { ExportMetadata } from "@write/reader-export";
import type { PublicScript } from "./types";
import { buildPublicReaderExportMetadata } from "./publicReaderExportMetadata";

export interface PublicReaderPrintSnapshot {
  metadata: ExportMetadata;
  headerHtml: string;
  /** Sanitized script body HTML (dark inline colors stripped via getRenderedSnapshot). */
  bodyHtml: string;
  printHtml: string;
}

/**
 * Derives all PDF print content from a PublicScript + rendered HTML string.
 * Runs the same sanitization pipeline as runtime export:
 *   renderedHtml → getRenderedSnapshot() → buildPrintHtml()
 *
 * NOTE: getRenderedSnapshot() requires DOM (document.createElement).
 * Tests must run in a jsdom environment.
 *
 * usePublicExport delegates to this function so the full export pipeline
 * is observable and testable without triggering window.print().
 */
export function buildPublicReaderPrintSnapshot(
  script: PublicScript,
  renderedHtml: string
): PublicReaderPrintSnapshot {
  const metadata = buildPublicReaderExportMetadata(script);
  const headerHtml = buildExportMetadataHtml(metadata, script.coverUrl);
  const renderedSnapshot = getRenderedSnapshot({ renderedHtml });
  const printHtml = buildPrintHtml({
    titleName: metadata.title || script.title || "Script",
    titleHtml: headerHtml,
    rawScriptHtml: renderedSnapshot.html,
  });
  return { metadata, headerHtml, bodyHtml: renderedSnapshot.html, printHtml };
}
