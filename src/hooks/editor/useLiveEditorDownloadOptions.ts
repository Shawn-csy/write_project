import { useCallback, useMemo } from "react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { loadBasicScriptExport, loadXlsxScriptExport } from "../../lib/scriptExportLoader";

export function useLiveEditorDownloadOptions({
  t,
  title,
  content,
  renderedHtmlRef,
  ensureRenderedHtml,
}) {
  const runRenderedExport = useCallback(
    async (exporter) => {
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
          await runRenderedExport((payload) => exportScriptAsPdf(title, payload));
        },
      },
      {
        id: "docx",
        label: t("publicReader.downloadDoc"),
        icon: FileText,
        onClick: async () => {
          const { exportScriptAsDocx } = await loadBasicScriptExport();
          await runRenderedExport((payload) => exportScriptAsDocx(title, payload));
        },
      },
      {
        id: "xlsx",
        label: t("publicReader.downloadXlsx"),
        icon: FileSpreadsheet,
        onClick: async () => {
          const { exportScriptAsXlsx } = await loadXlsxScriptExport();
          await runRenderedExport((payload) => exportScriptAsXlsx(title, payload));
        },
      },
    ],
    [content, runRenderedExport, t, title]
  );
}
