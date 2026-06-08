import { getAuthHeaders } from "./client";
import { downloadBlob, buildFilename } from "../download";

interface ScriptExportPayload {
  text?: string;
  renderedHtml?: string;
}

interface GoogleDocsExportPayload extends ScriptExportPayload {
  googleAccessToken: string;
  folderId?: string;
  docsBlocks?: Array<{
    runs: Array<{
      text: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      color?: string;
    }>;
  }>;
}

interface ReportExportPayload {
  columns: string[];
  rows: unknown[];
}

interface ReportDocxExportPayload extends ReportExportPayload {
  docTitle?: string;
}

const postExport = async (path: string, body: Record<string, unknown>): Promise<Blob> => {
  const headers = await getAuthHeaders();
  const res = await fetch(path, {
    method: "POST",
    headers: { ...(headers as Record<string, string>), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Export failed (${res.status}): ${msg}`);
  }
  return res.blob();
};

export const exportScriptAsXlsx = async (title: string, payload: ScriptExportPayload): Promise<void> => {
  const text = String(payload?.text || "");
  const rows = text.split("\n").map((line, idx) => ({ line: idx + 1, text: line }));
  const blob = await postExport("/api/export/xlsx", { title, rows });
  downloadBlob(blob, buildFilename(title || "script", "xlsx"));
};

export const exportScriptAsDocx = async (title: string, payload: ScriptExportPayload): Promise<void> => {
  const text = String(payload?.text || "");
  const blob = await postExport("/api/export/docx", { title, text });
  downloadBlob(blob, buildFilename(title || "script", "docx"));
};

export const exportScriptToGoogleDocs = async (
  title: string,
  payload: GoogleDocsExportPayload
): Promise<{ documentId: string; documentUrl: string }> => {
  const headers = await getAuthHeaders();
  if (import.meta.env.DEV && Array.isArray(payload?.docsBlocks)) {
    const preview = payload.docsBlocks.slice(0, 10).map((b, i) => ({
      i,
      runs: (b?.runs || []).map((r) => ({
        text: String(r?.text || "").slice(0, 60),
        bold: !!r?.bold,
        italic: !!r?.italic,
        underline: !!r?.underline,
        color: r?.color || "",
      })),
    }));
    // eslint-disable-next-line no-console
    console.log("[gdocs-export][docs_blocks preview]", preview);
  }
  const res = await fetch("/api/export/google-docs", {
    method: "POST",
    headers: { ...(headers as Record<string, string>), "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      text: String(payload?.text || ""),
      rendered_html: String(payload?.renderedHtml || ""),
      google_access_token: payload.googleAccessToken,
      folder_id: payload.folderId || null,
      docs_blocks: payload.docsBlocks || null,
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Google Docs export failed (${res.status}): ${msg}`);
  }
  return res.json();
};

interface TableV2ExportPayload {
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
  docTitle?: string;
  metadataRows?: string[];
}

export const exportTableV2ToGoogleDocs = async (
  title: string,
  {
    columns,
    rows,
    cellStyles,
    cellRuns,
    tableLayout,
    metadataRows,
    googleAccessToken,
    folderId,
  }: TableV2ExportPayload & { googleAccessToken: string; folderId?: string }
): Promise<{ documentId: string; documentUrl: string }> => {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/export/google-docs/v2", {
    method: "POST",
    headers: { ...(headers as Record<string, string>), "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      columns,
      rows,
      cell_styles: Array.isArray(cellStyles) ? cellStyles : null,
      cell_runs: Array.isArray(cellRuns) ? cellRuns : null,
      table_layout: tableLayout && typeof tableLayout === "object" ? tableLayout : null,
      metadata_rows: Array.isArray(metadataRows) ? metadataRows : null,
      google_access_token: googleAccessToken,
      folder_id: folderId || null,
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Google Docs table export failed (${res.status}): ${msg}`);
  }
  return res.json();
};

export const exportTableV2AsXlsx = async (title: string, { columns, rows }: TableV2ExportPayload): Promise<void> => {
  const blob = await postExport("/api/export/report/v2/xlsx", { title, columns, rows });
  downloadBlob(blob, buildFilename(title || "script", "xlsx"));
};

export const exportTableV2AsDocx = async (title: string, { columns, rows, docTitle }: TableV2ExportPayload): Promise<void> => {
  const blob = await postExport("/api/export/report/v2/docx", { title, doc_title: docTitle, columns, rows });
  downloadBlob(blob, buildFilename(title || "script", "docx"));
};

export const exportReportAsXlsx = async (title: string, { columns, rows }: ReportExportPayload): Promise<void> => {
  const blob = await postExport("/api/export/report/xlsx", { title, columns, rows });
  downloadBlob(blob, buildFilename(title || "script_report", "xlsx"));
};

export const exportReportAsDocx = async (title: string, { docTitle, columns, rows }: ReportDocxExportPayload): Promise<void> => {
  const blob = await postExport("/api/export/report/docx", {
    title,
    doc_title: docTitle,
    columns,
    rows,
  });
  downloadBlob(blob, buildFilename(title || "script_report", "docx"));
};
