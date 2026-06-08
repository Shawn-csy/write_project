import React, { useCallback, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, FileUp, Printer, Table } from "lucide-react";
import { ExportMetadataDialog } from "../../components/export/ExportMetadataDialog";
import { loadBasicScriptExport, loadXlsxScriptExport } from "../../lib/scriptExportLoader";
import { exportScriptToGoogleDocs, exportTableV2ToGoogleDocs } from "../../lib/api/export";
import { getGoogleDocsAccessToken } from "../../lib/firebase";
import { pickGoogleDriveFolder } from "../../lib/googleDrivePicker";
import { buildGoogleDocsBlocksFromScript } from "../../lib/googleDocsExportModel";
import {
  buildExportMetadataDocsBlocks,
  buildExportMetadataHtml,
  buildExportMetadataRows,
  filterExportMetadata,
  type ExportMetadata,
  type ExportMetadataFieldKey,
} from "../../lib/exportMetadata";
import type { MarkerConfig } from "../../types/script";
import type { DownloadOption } from "../../types/routes";
import type { GoogleDocsBlock } from "../../lib/googleDocsExportModel";

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
  metadataRows?: string[];
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
  googleDocsHeaderBlocks?: GoogleDocsBlock[];
  googleDocsTableHeaderRows?: string[];
  exportMetadata?: ExportMetadata | null;
  pdfCoverUrl?: unknown;
}

type ConfirmableExportKind = "pdf" | "google-docs" | "google-docs-table";

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
  googleDocsHeaderBlocks = [],
  googleDocsTableHeaderRows = [],
  exportMetadata = null,
  pdfCoverUrl,
}: UseScriptDownloadOptionsParams): DownloadOption[] {
  const [pendingExport, setPendingExport] = useState<ConfirmableExportKind | null>(null);
  const [selectedMetadataKeys, setSelectedMetadataKeys] = useState<ExportMetadataFieldKey[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const metadataKeys = useMemo(
    () => Array.from(new Set((exportMetadata?.fields || []).map((field) => field.key))),
    [exportMetadata]
  );

  const runRenderedExport = useCallback(
    async (exporter: (payload: ExportPayload) => Promise<void>) => {
      const currentHtml = (await Promise.resolve(getRenderedHtml())) || "";
      await exporter({ text: content, renderedHtml: currentHtml });
    },
    [content, getRenderedHtml]
  );

  const resolveSelectedMetadata = useCallback((keys: ExportMetadataFieldKey[]) =>
    exportMetadata ? filterExportMetadata(exportMetadata, keys) : null
  , [exportMetadata]);

  const executeExport = useCallback(async (kind: ConfirmableExportKind, keys: ExportMetadataFieldKey[]) => {
    const selectedMetadata = resolveSelectedMetadata(keys);
    const headerBlocks = selectedMetadata ? buildExportMetadataDocsBlocks(selectedMetadata) : googleDocsHeaderBlocks;
    const tableHeaderRows = selectedMetadata ? buildExportMetadataRows(selectedMetadata) : googleDocsTableHeaderRows;

    const runClassicGoogleDocsExport = async (payload: ExportPayload, token: string, folderId: string, blocks: GoogleDocsBlock[]) => {
      const docsBlocks = buildGoogleDocsBlocksFromScript(content, markerConfigs);
      if (docsBlocks.length === 0) {
        throw new Error("Google Docs export failed: rendered output is empty, cannot build export blocks.");
      }
      const result = await exportScriptToGoogleDocs(title, {
        ...payload,
        googleAccessToken: token,
        folderId,
        docsBlocks: [...blocks, ...docsBlocks],
      });
      if (result?.documentUrl) {
        window.open(result.documentUrl, "_blank", "noopener,noreferrer");
      }
    };

    if (kind === "pdf") {
      const { exportScriptAsPdf } = await loadBasicScriptExport();
      const headerHtml = selectedMetadata ? buildExportMetadataHtml(selectedMetadata, pdfCoverUrl) : pdfHeaderHtml;
      await runRenderedExport((payload) => exportScriptAsPdf(title, { ...payload, headerHtml }));
      return;
    }

    const token = await getGoogleDocsAccessToken();
    const folderId = await pickGoogleDriveFolder(token);
    if (!folderId) return;

    await runRenderedExport(async (payload) => {
      if (kind === "google-docs" && preferTableForGoogleDocs && enableGoogleDocsTable) {
        const tableExport = resolveTableExport?.(payload.renderedHtml);
        if (tableExport) {
          const tableResult = await exportTableV2ToGoogleDocs(title, {
            ...tableExport,
            metadataRows: tableHeaderRows,
            googleAccessToken: token,
            folderId,
          });
          if (tableResult?.documentUrl) window.open(tableResult.documentUrl, "_blank", "noopener,noreferrer");
          return;
        }
        if (fallbackToClassicWhenTableMissing) {
          await runClassicGoogleDocsExport(payload, token, folderId, headerBlocks);
          return;
        }
      }

      if (kind === "google-docs-table") {
        const tableExport = resolveTableExport?.(payload.renderedHtml);
        if (!tableExport) {
          if (!fallbackToClassicWhenTableMissing) {
            throw new Error("Google Docs table export failed: V2 table structure not found.");
          }
          await runClassicGoogleDocsExport(payload, token, folderId, headerBlocks);
          return;
        }
        const result = await exportTableV2ToGoogleDocs(title, {
          ...tableExport,
          metadataRows: tableHeaderRows,
          googleAccessToken: token,
          folderId,
        });
        if (result?.documentUrl) window.open(result.documentUrl, "_blank", "noopener,noreferrer");
        return;
      }

      await runClassicGoogleDocsExport(payload, token, folderId, headerBlocks);
    });
  }, [
    content,
    enableGoogleDocsTable,
    fallbackToClassicWhenTableMissing,
    googleDocsHeaderBlocks,
    googleDocsTableHeaderRows,
    markerConfigs,
    pdfCoverUrl,
    pdfHeaderHtml,
    preferTableForGoogleDocs,
    resolveSelectedMetadata,
    resolveTableExport,
    runRenderedExport,
    title,
  ]);

  const openExportConfirm = useCallback((kind: ConfirmableExportKind) => {
    if (!exportMetadata || metadataKeys.length === 0) {
      void executeExport(kind, metadataKeys);
      return;
    }
    setSelectedMetadataKeys(metadataKeys);
    setPendingExport(kind);
  }, [executeExport, exportMetadata, metadataKeys]);

  const confirmPendingExport = useCallback(async () => {
    if (!pendingExport) return;
    setIsExporting(true);
    try {
      await executeExport(pendingExport, selectedMetadataKeys);
      setPendingExport(null);
    } finally {
      setIsExporting(false);
    }
  }, [executeExport, pendingExport, selectedMetadataKeys]);

  return useMemo(() => {
    const options: DownloadOption[] = [];
    const showDedicatedTableOption = enableGoogleDocsTable && showGoogleDocsTableOption;
    const showClassicGoogleDocsOption = showGoogleDocs && (allowBothGoogleDocsOptions || !showDedicatedTableOption);

    if (showPdf) {
      options.push({
        id: "pdf",
        label: t("publicReader.exportPdf"),
        icon: Printer,
        onClick: () => openExportConfirm("pdf"),
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
        onClick: () => openExportConfirm("google-docs"),
        disabled: disableGoogleDocs,
      });
    }

    if (showDedicatedTableOption) {
      options.push({
        id: "google-docs-table",
        label: t("publicReader.exportGoogleDocsTable"),
        icon: Table,
        onClick: () => openExportConfirm("google-docs-table"),
        disabled: disableGoogleDocs,
      });
    }

    const renderDialog = () => React.createElement(ExportMetadataDialog, {
      open: Boolean(pendingExport),
      fields: exportMetadata?.fields || [],
      selectedKeys: selectedMetadataKeys,
      onToggleKey: (key: ExportMetadataFieldKey, checked: boolean) => {
        setSelectedMetadataKeys((prev) => checked ? Array.from(new Set([...prev, key])) : prev.filter((item) => item !== key));
      },
      onSelectAll: () => {
        setSelectedMetadataKeys((prev) => prev.length >= metadataKeys.length ? [] : metadataKeys);
      },
      onOpenChange: (open: boolean) => {
        if (!open && !isExporting) setPendingExport(null);
      },
      onConfirm: confirmPendingExport,
      isExporting,
    });
    if (options.length > 0 && exportMetadata && metadataKeys.length > 0) {
      options[0] = { ...options[0], renderDialog };
    }

    return options;
  }, [
    t,
    runRenderedExport,
    title,
    disablePdf,
    disableDocx,
    disableXlsx,
    disableGoogleDocs,
    showPdf,
    showDocx,
    showXlsx,
    showGoogleDocs,
    enableGoogleDocsTable,
    showGoogleDocsTableOption,
    allowBothGoogleDocsOptions,
    openExportConfirm,
    pendingExport,
    exportMetadata,
    selectedMetadataKeys,
    metadataKeys,
    confirmPendingExport,
    isExporting,
  ]);
}
