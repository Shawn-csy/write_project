import ExcelJS from "exceljs";
import { buildFilename, downloadBlob } from "./download";
import { buildExportDom, collectStyledRuns, normalizeText } from "./scriptExportShared";

export const exportScriptAsXlsx = async (title, payload) => {
  const dom = buildExportDom(payload?.renderedHtml || "", payload?.text || "");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Script", { views: [{ state: "frozen", ySplit: 1 }] });

  sheet.columns = [
    { header: "行號", key: "line", width: 10 },
    { header: "內容", key: "content", width: 120 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
  });

  if (dom) {
    dom.lines.forEach((lineEl, idx) => {
      const runs = collectStyledRuns(lineEl);
      const text = normalizeText(lineEl.innerText || lineEl.textContent || "");
      const row = sheet.addRow({ line: idx + 1, content: text });
      const contentCell = row.getCell(2);
      contentCell.alignment = { vertical: "top", wrapText: true };
      if (runs.length > 0) {
        contentCell.value = {
          richText: runs.map((run) => {
            const font = {};
            if (run.style?.color) font.color = { argb: run.style.color };
            if (run.style?.bold) font.bold = true;
            if (run.style?.italic) font.italic = true;
            if (run.style?.underline) font.underline = true;
            return { text: run.text, font };
          }),
        };
      }
    });
    dom.root.remove();
  } else {
    normalizeText(payload?.text || "")
      .split("\n")
      .forEach((line, idx) => {
        const row = sheet.addRow({ line: idx + 1, content: line });
        row.getCell(2).alignment = { vertical: "top", wrapText: true };
      });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, buildFilename(title || "script", "xlsx"));
};
