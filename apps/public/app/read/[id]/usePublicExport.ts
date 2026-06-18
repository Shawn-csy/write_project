"use client";

import { useCallback, useEffect, useState } from "react";
import { exportScriptAsPdf, pickRenderedRoot } from "@write/reader-export";
import type { PublicScript } from "@/lib/types";
import { buildPublicReaderPrintSnapshot } from "@/lib/publicReaderPrintSnapshot";

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

  const handleExportPdf = useCallback(async () => {
    const root = pickRenderedRoot();
    if (!root) return;
    const { metadata, headerHtml, bodyHtml } = buildPublicReaderPrintSnapshot(script, root.outerHTML);
    await exportScriptAsPdf(metadata.title || script.title, { renderedHtml: bodyHtml, headerHtml });
  }, [script]);

  return { handleExportPdf, pdfReady };
}
