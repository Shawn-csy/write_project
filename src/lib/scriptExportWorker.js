import ExcelJS from "exceljs";

const buildXlsxBufferFromRows = async (rows = []) => {
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

  rows.forEach((item, idx) => {
    const line = Number(item?.line || idx + 1);
    const text = String(item?.text || "");
    const runs = Array.isArray(item?.runs) ? item.runs : [];
    const row = sheet.addRow({ line, content: text });
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
          return { text: String(run.text || ""), font };
        }),
      };
    }
  });

  return workbook.xlsx.writeBuffer();
};

const toArrayBuffer = (value) => {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }
  return new TextEncoder().encode(String(value ?? "")).buffer;
};

const buildDocBuffer = (html) => {
  const encoder = new TextEncoder();
  return encoder.encode(String(html || "")).buffer;
};

self.onmessage = async (event) => {
  const { id, type, payload } = event.data || {};
  if (!id) return;
  try {
    if (type === "xlsx") {
      const rawBuffer = await buildXlsxBufferFromRows(payload?.rows || []);
      const buffer = toArrayBuffer(rawBuffer);
      self.postMessage({ id, ok: true, result: { buffer } }, [buffer]);
      return;
    }
    if (type === "doc") {
      const buffer = buildDocBuffer(payload?.html || "");
      self.postMessage({ id, ok: true, result: { buffer } }, [buffer]);
      return;
    }
    throw new Error(`Unsupported worker task type: ${String(type)}`);
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown worker error",
    });
  }
};
