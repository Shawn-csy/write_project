"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { exportScriptAsPdf, pickRenderedRoot, buildExportMetadataHtml } from "@write/reader-export";
import type { PublicScript } from "@/lib/types";
import { buildPublicReaderExportMetadata } from "@/lib/publicReaderExportMetadata";

export function usePublicExport(script: PublicScript) {
  const [pdfReady, setPdfReady] = useState(false);

  // Poll for .script-renderer presence after mount (it renders client-side).
  // Uses rAF loop so it catches the DOM as soon as the renderer paints,
  // regardless of hydration/Suspense/slow data timing.
  useEffect(() => {
    if (pickRenderedRoot()) { setPdfReady(true); return; }
    let rafId: number;
    const check = () => {
      if (pickRenderedRoot()) { setPdfReady(true); return; }
      rafId = window.requestAnimationFrame(check);
    };
    rafId = window.requestAnimationFrame(check);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const exportMetadata = useMemo(() => buildPublicReaderExportMetadata(script), [script]);

  const handleExportPdf = useCallback(async () => {
    const root = pickRenderedRoot();
    if (!root) return;
    const renderedHtml = root.outerHTML;
    const headerHtml = buildExportMetadataHtml(exportMetadata, script.coverUrl);
    await exportScriptAsPdf(script.title, { renderedHtml, headerHtml });
  }, [exportMetadata, script.coverUrl, script.title]);

  return { handleExportPdf, pdfReady };
}
