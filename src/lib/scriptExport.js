import { buildFilename, downloadBlob, downloadText } from "./download";
import ExcelJS from "exceljs";

const normalizeText = (text = "") =>
  String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n");

const cssColorToArgb = (color) => {
  if (!color || color === "transparent") return null;
  const hexMatch = color.trim().match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      const [r, g, b] = hex.split("");
      return `FF${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    if (hex.length === 6) return `FF${hex}`.toUpperCase();
    if (hex.length === 8) return `${hex.slice(6, 8)}${hex.slice(0, 6)}`.toUpperCase();
  }
  const rgbMatch = color.match(/rgba?\(([^)]+)\)/i);
  if (!rgbMatch) return null;
  const [r, g, b] = rgbMatch[1]
    .split(",")
    .slice(0, 3)
    .map((v) => Math.max(0, Math.min(255, Number(v.trim()) || 0)));
  const toHex = (v) => v.toString(16).padStart(2, "0");
  return `FF${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const collectStyledRuns = (root, inherited = {}) => {
  const runs = [];
  const visit = (node, parentStyle) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.nodeValue) return;
      runs.push({ text: node.nodeValue, style: parentStyle });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node;
    const cs = window.getComputedStyle(el);
    const nextStyle = {
      color: cssColorToArgb(cs.color) || parentStyle.color || null,
      bold: Number(cs.fontWeight) >= 600 || parentStyle.bold || false,
      italic: cs.fontStyle === "italic" || parentStyle.italic || false,
      underline: cs.textDecorationLine.includes("underline") || parentStyle.underline || false,
    };
    el.childNodes.forEach((child) => visit(child, nextStyle));
  };
  visit(root, inherited);
  return runs.filter((run) => run.text && run.text.length > 0);
};

const getInlineCss = (el) => {
  const cs = window.getComputedStyle(el);
  const styleKeys = [
    "color",
    "background-color",
    "font-weight",
    "font-style",
    "text-decoration",
    "text-align",
    "font-size",
    "font-family",
    "white-space",
    "line-height",
    "letter-spacing",
  ];
  return styleKeys
    .map((key) => {
      const value = cs.getPropertyValue(key);
      if (!value) return "";
      if (key === "background-color" && /rgba?\(0,\s*0,\s*0,\s*0\)/.test(value)) return "";
      return `${key}:${value};`;
    })
    .filter(Boolean)
    .join("");
};

const pickRenderedRoot = () => {
  if (typeof document === "undefined") return null;
  const nodes = Array.from(document.querySelectorAll(".script-renderer"));
  if (nodes.length === 0) return null;

  const visibleNodes = nodes.filter((n) => {
    const rect = n.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  const candidates = visibleNodes.length > 0 ? visibleNodes : nodes;
  candidates.sort((a, b) => (b.innerText || "").length - (a.innerText || "").length);
  return candidates[0] || null;
};

const buildRenderedHtmlFromDom = () => {
  const root = pickRenderedRoot();
  if (!root || typeof document === "undefined") return "";

  const clone = root.cloneNode(true);
  const origAll = [root, ...Array.from(root.querySelectorAll("*"))];
  const cloneAll = [clone, ...Array.from(clone.querySelectorAll("*"))];
  for (let i = 0; i < Math.min(origAll.length, cloneAll.length); i += 1) {
    const css = getInlineCss(origAll[i]);
    if (!css) continue;
    const prev = cloneAll[i].getAttribute("style") || "";
    cloneAll[i].setAttribute("style", `${prev}${prev ? ";" : ""}${css}`);
  }
  return clone.outerHTML;
};

const buildExportDom = (renderedHtml = "", fallbackText = "") => {
  if (typeof document === "undefined") return null;
  const finalRenderedHtml = renderedHtml || buildRenderedHtmlFromDom();
  if (!finalRenderedHtml) return null;

  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-99999px";
  root.style.top = "-99999px";
  root.style.width = "1200px";
  root.style.opacity = "0";
  root.innerHTML = finalRenderedHtml;
  document.body.appendChild(root);

  root.querySelectorAll("*").forEach((el) => {
    const css = getInlineCss(el);
    if (css) {
      const prev = el.getAttribute("style") || "";
      el.setAttribute("style", `${prev}${prev ? ";" : ""}${css}`);
    }
  });

  const lines = Array.from(root.querySelectorAll(".script-line"));
  if (lines.length === 0) {
    const fallbackLines = normalizeText(root.innerText || root.textContent || fallbackText).split("\n");
    const wrapper = document.createElement("div");
    fallbackLines.forEach((line) => {
      const span = document.createElement("span");
      span.className = "script-line";
      span.style.display = "block";
      span.style.whiteSpace = "pre-wrap";
      span.textContent = line;
      wrapper.appendChild(span);
    });
    return { root, lines: Array.from(wrapper.querySelectorAll(".script-line")) };
  }

  return { root, lines };
};

const getRenderedSnapshot = ({ renderedHtml = "", text = "" } = {}) => {
  const dom = buildExportDom(renderedHtml, text);
  if (!dom) {
    const normalized = normalizeText(text);
    return {
      html: normalized
        .split("\n")
        .map((line) => `<div style="white-space:pre-wrap">${line || "&nbsp;"}</div>`)
        .join(""),
      lines: normalized.split("\n").map((line, index) => ({
        line: index + 1,
        text: line,
        html: line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
      })),
    };
  }

  const lines = dom.lines.map((lineEl, index) => ({
    line: index + 1,
    text: normalizeText(lineEl.innerText || lineEl.textContent || ""),
    html: lineEl.innerHTML && lineEl.innerHTML.trim().length > 0 ? lineEl.innerHTML : "&nbsp;",
  }));

  const html = dom.root.innerHTML;
  dom.root.remove();
  return { html, lines };
};

const getRenderedLines = ({ renderedHtml = "", text = "" } = {}) => {
  return getRenderedSnapshot({ renderedHtml, text }).lines;
};

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

const toExcelHtmlDoc = (bodyHtml, title = "Script") => `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <meta name="ProgId" content="Excel.Sheet" />
    <meta name="Generator" content="Microsoft Excel 11" />
    <title>${title}</title>
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Script</x:Name>
            <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: "Noto Sans TC", "PingFang TC", sans-serif; margin: 16px; }
      table { border-collapse: collapse; width: 100%; table-layout: fixed; }
      th, td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
      th { background: #111827; color: #fff; text-align: left; font-weight: 700; }
      .line-no { width: 72px; color: #6b7280; text-align: right; mso-number-format: "0"; }
      .line-content { white-space: pre-wrap; word-break: break-word; }
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

export const exportScriptAsDocx = async (title, payload) => {
  const snapshot = getRenderedSnapshot(payload);
  const html = toHtmlDoc(`<h1>${title || "Script"}</h1><div>${snapshot.html}</div>`, title || "Script");
  const blob = new Blob([html], { type: "application/msword;charset=utf-8;" });
  downloadBlob(blob, buildFilename(title || "script", "doc"));
};
