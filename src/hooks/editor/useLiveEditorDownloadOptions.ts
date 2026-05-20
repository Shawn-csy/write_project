import { useCallback, useMemo } from "react";
import { FileSpreadsheet, FileText, FileUp, Printer, Table } from "lucide-react";
import { loadBasicScriptExport, loadXlsxScriptExport } from "../../lib/scriptExportLoader";
import { exportScriptToGoogleDocs, exportTableV2ToGoogleDocs } from "../../lib/api/export";
import { getGoogleDocsAccessToken } from "../../lib/firebase";
import { pickGoogleDriveFolder } from "../../lib/googleDrivePicker";
import { buildGoogleDocsBlocksFromScript } from "../../lib/googleDocsExportModel";
import { buildV2TableExport, buildV2TableExportFromRenderedHtml } from "../../lib/v2/exportAdapter";
import type { OrchestratedDocument } from "../../lib/v2/types";
import type { MarkerConfig } from "../../types/script";

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
  markerConfigs?: MarkerConfig[];
  orchestratedDoc?: OrchestratedDocument | null;
}

export function useLiveEditorDownloadOptions({
  t,
  title,
  content,
  renderedHtmlRef,
  ensureRenderedHtml,
  markerConfigs = [],
  orchestratedDoc,
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
      {
        id: "google-docs",
        label: t("publicReader.exportGoogleDocs"),
        icon: FileUp,
        onClick: async () => {
          const token = await getGoogleDocsAccessToken();
          const folderId = await pickGoogleDriveFolder(token);
          if (!folderId) return;
          await runRenderedExport(async (payload: ExportPayload) => {
            const docsBlocks = buildGoogleDocsBlocksFromScript(content, markerConfigs);
            if (docsBlocks.length === 0) {
              throw new Error("Google Docs export failed: rendered output is empty, cannot build export blocks.");
            }
            const result = await exportScriptToGoogleDocs(title, {
              ...payload,
              googleAccessToken: token,
              folderId,
              docsBlocks,
            });
            if (result?.documentUrl) {
              window.open(result.documentUrl, "_blank", "noopener,noreferrer");
            }
          });
        },
      },
      ...(orchestratedDoc
        ? [
            {
              id: "google-docs-table",
              label: t("publicReader.exportGoogleDocsTable"),
              icon: Table,
              onClick: async () => {
                const token = await getGoogleDocsAccessToken();
                const folderId = await pickGoogleDriveFolder(token);
                if (!folderId) return;
                await runRenderedExport(async (payload: ExportPayload) => {
                  const tableExport = buildV2TableExportFromRenderedHtml(payload.renderedHtml)
                    || buildV2TableExport(orchestratedDoc, markerConfigs);
                  const result = await exportTableV2ToGoogleDocs(title, {
                    ...tableExport,
                    googleAccessToken: token,
                    folderId,
                  });
                  if (result?.documentUrl) {
                    window.open(result.documentUrl, "_blank", "noopener,noreferrer");
                  }
                });
              },
            },
          ]
        : []),
    ],
    [content, runRenderedExport, t, title, markerConfigs, orchestratedDoc]
  );
}
