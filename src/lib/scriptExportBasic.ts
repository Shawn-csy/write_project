import { buildFilename, downloadBlob, downloadText } from "./download";
import { getRenderedLines } from "./scriptExportShared";

export { exportScriptAsPdf } from "@write/reader-export";

export const exportScriptAsFountain = (title: string, content: string) => {
  downloadText(content ?? "", buildFilename(title || "script", "fountain"));
};

export const exportScriptAsCsv = (
  title: string,
  payload: { renderedHtml?: string; text?: string } = {}
) => {
  const rows = getRenderedLines(payload);
  const header = "行號,內容";
  const lines = rows.map((row) => `${row.line},"${String(row.text).replace(/"/g, '""')}"`);
  const csvContent = `\uFEFF${[header, ...lines].join("\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, buildFilename(title || "script", "csv"));
};
