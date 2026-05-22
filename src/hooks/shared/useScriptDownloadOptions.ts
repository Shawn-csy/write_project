import { useCallback, useMemo } from "react";
import { FileSpreadsheet, FileText, FileUp, Printer, Table } from "lucide-react";
import { loadBasicScriptExport, loadXlsxScriptExport } from "../../lib/scriptExportLoader";
import { exportScriptToGoogleDocs, exportTableV2ToGoogleDocs } from "../../lib/api/export";
import { getGoogleDocsAccessToken } from "../../lib/firebase";
import { pickGoogleDriveFolder } from "../../lib/googleDrivePicker";
import { buildGoogleDocsBlocksFromScript } from "../../lib/googleDocsExportModel";
import type { MarkerConfig } from "../../types/script";
import type { DownloadOption } from "../../types/routes";

interface ExportPayload {
  text: string;
  renderedHtml: string;
}

interface TableExportPayload {
  columns: string[];
  rows: string[][];
  cellStyles?: Array<Array<{
    backgroundColor?: string;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
  } | null>>;
  cellRuns?: Array<Array<Array<{
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
  }>>>;
  tableLayout?: {
    columnWidths?: number[];
    defaultCellStyle?: {
      paddingTop?: number;
      paddingRight?: number;
      paddingBottom?: number;
      paddingLeft?: number;
    };
  };
}

interface UseScriptDownloadOptionsParams {
  t: (key: string) => string;
  title: string;
  content: string;
  markerConfigs?: MarkerConfig[];
  getRenderedHtml: () => string | Promise<string>;
  pdfHeaderHtml?: string;
  disablePdf?: boolean;
  disableDocx?: boolean;
  disableXlsx?: boolean;
  disableGoogleDocs?: boolean;
  showPdf?: boolean;
  showDocx?: boolean;
  showXlsx?: boolean;
  showGoogleDocs?: boolean;
  preferTableForGoogleDocs?: boolean;
  fallbackToClassicWhenTableMissing?: boolean;
  enableGoogleDocsTable?: boolean;
  showGoogleDocsTableOption?: boolean;
  allowBothGoogleDocsOptions?: boolean;
  resolveTableExport?: (renderedHtml: string) => TableExportPayload | null;
}

export function useScriptDownloadOptions({
  t,
  title,
  content,
  markerConfigs = [],
  getRenderedHtml,
  pdfHeaderHtml,
  disablePdf = false,
  disableDocx = false,
  disableXlsx = false,
  disableGoogleDocs = false,
  showPdf = true,
  showDocx = true,
  showXlsx = true,
  showGoogleDocs = true,
  preferTableForGoogleDocs = false,
  fallbackToClassicWhenTableMissing = true,
  enableGoogleDocsTable = false,
  showGoogleDocsTableOption = true,
  allowBothGoogleDocsOptions = false,
  resolveTableExport,
}: UseScriptDownloadOptionsParams): DownloadOption[] {
  const runRenderedExport = useCallback(
    async (exporter: (payload: ExportPayload) => Promise<void>) => {
      const currentHtml = (await Promise.resolve(getRenderedHtml())) || "";
      await exporter({ text: content, renderedHtml: currentHtml });
    },
    [content, getRenderedHtml]
  );

  return useMemo(() => {
    const options: DownloadOption[] = [];
    const showDedicatedTableOption = enableGoogleDocsTable && showGoogleDocsTableOption;
    const showClassicGoogleDocsOption = showGoogleDocs && (allowBothGoogleDocsOptions || !showDedicatedTableOption);

    const runClassicGoogleDocsExport = async (payload: ExportPayload, token: string, folderId: string) => {
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
    };

    if (showPdf) {
      options.push({
        id: "pdf",
        label: t("publicReader.exportPdf"),
        icon: Printer,
        onClick: async () => {
          const { exportScriptAsPdf } = await loadBasicScriptExport();
          await runRenderedExport((payload) => exportScriptAsPdf(title, { ...payload, headerHtml: pdfHeaderHtml }));
        },
        disabled: disablePdf,
      });
    }

    if (showDocx) {
      options.push({
        id: "docx",
        label: t("publicReader.downloadDoc"),
        icon: FileText,
        onClick: async () => {
          const { exportScriptAsDocx } = await loadBasicScriptExport();
          await runRenderedExport((payload) => exportScriptAsDocx(title, payload));
        },
        disabled: disableDocx,
      });
    }

    if (showXlsx) {
      options.push({
        id: "xlsx",
        label: t("publicReader.downloadXlsx"),
        icon: FileSpreadsheet,
        onClick: async () => {
          const { exportScriptAsXlsx } = await loadXlsxScriptExport();
          await runRenderedExport((payload) => exportScriptAsXlsx(title, payload));
        },
        disabled: disableXlsx,
      });
    }

    if (showClassicGoogleDocsOption) {
      options.push({
        id: "google-docs",
        label: t("publicReader.exportGoogleDocs"),
        icon: FileUp,
        onClick: async () => {
          const token = await getGoogleDocsAccessToken();
          const folderId = await pickGoogleDriveFolder(token);
          if (!folderId) return;
          await runRenderedExport(async (payload) => {
            if (preferTableForGoogleDocs && enableGoogleDocsTable) {
              const tableExport = resolveTableExport?.(payload.renderedHtml);
              if (tableExport) {
                const tableResult = await exportTableV2ToGoogleDocs(title, {
                  ...tableExport,
                  googleAccessToken: token,
                  folderId,
                });
                if (tableResult?.documentUrl) {
                  window.open(tableResult.documentUrl, "_blank", "noopener,noreferrer");
                }
                return;
              }
              if (fallbackToClassicWhenTableMissing) {
                await runClassicGoogleDocsExport(payload, token, folderId);
                return;
              }
            }
            await runClassicGoogleDocsExport(payload, token, folderId);
          });
        },
        disabled: disableGoogleDocs,
      });
    }

    if (showDedicatedTableOption) {
      options.push({
        id: "google-docs-table",
        label: t("publicReader.exportGoogleDocsTable"),
        icon: Table,
        onClick: async () => {
          const token = await getGoogleDocsAccessToken();
          const folderId = await pickGoogleDriveFolder(token);
          if (!folderId) return;
          await runRenderedExport(async (payload) => {
            const tableExport = resolveTableExport?.(payload.renderedHtml);
            if (!tableExport) {
              if (!fallbackToClassicWhenTableMissing) {
                throw new Error("Google Docs table export failed: V2 table structure not found.");
              }
              await runClassicGoogleDocsExport(payload, token, folderId);
              return;
            }
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
        disabled: disableGoogleDocs,
      });
    }

    return options;
  }, [
    t,
    runRenderedExport,
    title,
    pdfHeaderHtml,
    disablePdf,
    disableDocx,
    disableXlsx,
    disableGoogleDocs,
    showPdf,
    showDocx,
    showXlsx,
    showGoogleDocs,
    preferTableForGoogleDocs,
    fallbackToClassicWhenTableMissing,
    content,
    markerConfigs,
    enableGoogleDocsTable,
    showGoogleDocsTableOption,
    allowBothGoogleDocsOptions,
    resolveTableExport,
  ]);
}
