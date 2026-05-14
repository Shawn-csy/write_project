import { getAuthHeaders } from "./client";
import { downloadBlob, buildFilename } from "../download";

interface ScriptExportPayload {
  text?: string;
  renderedHtml?: string;
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
