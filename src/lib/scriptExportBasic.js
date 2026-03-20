import { buildFilename, downloadBlob, downloadText } from "./download";
import { getRenderedSnapshot, getRenderedLines } from "./scriptExportShared";
import { buildPrintHtml } from "./print";
import { runExportWorkerTask } from "./scriptExportWorkerClient";

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
  let docBuffer;
  try {
    const result = await runExportWorkerTask("doc", { html });
    docBuffer = result.buffer;
  } catch (error) {
    console.warn("Worker doc export failed; falling back to main thread.", error);
    docBuffer = html;
  }
  const blob = new Blob([docBuffer], { type: "application/msword;charset=utf-8;" });
  downloadBlob(blob, buildFilename(title || "script", "doc"));
};

export const exportScriptAsPdf = async (title, payload = {}) => {
  const snapshot = getRenderedSnapshot(payload);
  const headerHtml = payload?.headerHtml || `<h1>${title || "Script"}</h1>`;
  const exportHtml = buildPrintHtml({
    titleName: title || "Script",
    activeFile: title || "Script",
    titleHtml: headerHtml,
    rawScriptHtml: snapshot.html,
  });

  const styles = Array.from(document.querySelectorAll("style, link[rel=\"stylesheet\"]"))
    .map((node) => node.cloneNode(true));

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "-9999px";
  iframe.style.bottom = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    iframe.remove();
    window.print();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(exportHtml);
  iframeDoc.close();
  styles.forEach((styleNode) => iframeDoc.head.appendChild(styleNode));

  const waitForImages = (doc, timeoutMs = 2200) =>
    new Promise((resolve) => {
      const images = Array.from(doc.images || []).filter((img) => !img.complete);
      if (images.length === 0) {
        resolve();
        return;
      }
      let done = 0;
      const finish = () => {
        done += 1;
        if (done >= images.length) resolve();
      };
      images.forEach((img) => {
        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", finish, { once: true });
      });
      window.setTimeout(resolve, timeoutMs);
    });

  waitForImages(iframeDoc).finally(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => {
      iframe.remove();
    }, 2000);
  });
};
