import { useCallback, useMemo } from "react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { loadBasicScriptExport, loadXlsxScriptExport } from "../../lib/scriptExportLoader";

interface RenderedHtmlRef {
  current: {
    processed?: string;
    raw?: string;
  };
}

interface ExportPayload {
  text: string;
  renderedHtml: string;
}

interface UseLiveEditorDownloadOptionsParams {
  t: (key: string) => string;
  title: string;
  content: string;
  renderedHtmlRef: RenderedHtmlRef;
  ensureRenderedHtml?: () => Promise<string>;
}

export function useLiveEditorDownloadOptions({
  t,
  title,
  content,
  renderedHtmlRef,
  ensureRenderedHtml,
}: UseLiveEditorDownloadOptionsParams) {
  const runRenderedExport = useCallback(
    async (exporter: (payload: ExportPayload) => Promise<void>) => {
      let currentHtml = renderedHtmlRef.current.processed || renderedHtmlRef.current.raw;
      if (!currentHtml && ensureRenderedHtml) {
        currentHtml = await ensureRenderedHtml();
      }
      if (currentHtml) {
        await exporter({ text: content, renderedHtml: currentHtml });
        return;
      }
      await exporter({ text: content, renderedHtml: "" });
    },
    [content, ensureRenderedHtml, renderedHtmlRef]
  );

  return useMemo(
    () => [
      {
        id: "pdf",
        label: t("publicReader.exportPdf"),
        icon: Printer,
        onClick: async () => {
          const { exportScriptAsPdf } = await loadBasicScriptExport();
          await runRenderedExport((payload: ExportPayload) => exportScriptAsPdf(title, payload));
        },
      },
      {
        id: "docx",
        label: t("publicReader.downloadDoc"),
        icon: FileText,
        onClick: async () => {
          const { exportScriptAsDocx } = await loadBasicScriptExport();
          await runRenderedExport((payload: ExportPayload) => exportScriptAsDocx(title, payload));
        },
      },
      {
        id: "xlsx",
        label: t("publicReader.downloadXlsx"),
        icon: FileSpreadsheet,
        onClick: async () => {
          const { exportScriptAsXlsx } = await loadXlsxScriptExport();
          await runRenderedExport((payload: ExportPayload) => exportScriptAsXlsx(title, payload));
        },
      },
    ],
    [content, runRenderedExport, t, title]
  );
}
