import { buildFilename, downloadBlob } from "./download";
import { buildExportDom, collectStyledRuns, normalizeText } from "./scriptExportShared";
import { runExportWorkerTask } from "./scriptExportWorkerClient";

const buildRows = (payload = {}) => {
  const dom = buildExportDom(payload.renderedHtml || "", payload.text || "");
  if (dom) {
    const rows = dom.lines.map((lineEl, idx) => {
      const runs = collectStyledRuns(lineEl).map((run) => ({
        text: String(run.text || ""),
        style: {
          color: run.style?.color || null,
          bold: Boolean(run.style?.bold),
          italic: Boolean(run.style?.italic),
          underline: Boolean(run.style?.underline),
        },
      }));
      return {
        line: idx + 1,
        text: normalizeText(lineEl.innerText || lineEl.textContent || ""),
        runs,
      };
    });
    dom.root.remove();
    return rows;
  }

  return normalizeText(payload.text || "")
    .split("\n")
    .map((line, idx) => ({
      line: idx + 1,
      text: line,
      runs: [],
    }));
};

export const exportScriptAsXlsx = async (title, payload) => {
  const rows = buildRows(payload);
  const result = await runExportWorkerTask("xlsx", { rows });
  const buffer = result?.buffer;
  if (!buffer) throw new Error("Failed to generate xlsx export buffer.");

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, buildFilename(title || "script", "xlsx"));
};
