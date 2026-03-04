import { buildFilename, downloadBlob, downloadText } from "./download";
import { getRenderedSnapshot, getRenderedLines } from "./scriptExportShared";

const toHtmlDoc = (bodyHtml, title = "Script") => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: "Noto Sans TC", "PingFang TC", sans-serif; margin: 24px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
      th { background: #111827; color: #fff; text-align: left; }
      .line-no { width: 72px; text-align: right; color: #6b7280; }
      .line-content { white-space: pre-wrap; }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;

export const exportScriptAsFountain = (title, content) => {
  downloadText(content ?? "", buildFilename(title || "script", "fountain"));
};

export const exportScriptAsCsv = (title, payload) => {
  const rows = getRenderedLines(payload);
  const header = "行號,內容";
  const lines = rows.map((row) => `${row.line},"${String(row.text).replace(/"/g, '""')}"`);
  const csvContent = `\uFEFF${[header, ...lines].join("\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, buildFilename(title || "script", "csv"));
};

export const exportScriptAsDocx = async (title, payload) => {
  const snapshot = getRenderedSnapshot(payload);
  const html = toHtmlDoc(`<h1>${title || "Script"}</h1><div>${snapshot.html}</div>`, title || "Script");
  const blob = new Blob([html], { type: "application/msword;charset=utf-8;" });
  downloadBlob(blob, buildFilename(title || "script", "doc"));
};
