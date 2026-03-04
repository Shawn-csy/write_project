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

export { normalizeText, buildExportDom, getRenderedSnapshot, getRenderedLines, collectStyledRuns };
