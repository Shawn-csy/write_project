import type { ReadWorkHeaderModel } from "./readWorkHeaderModel";

/**
 * Builds the HTML header injected above the script body in PDF export.
 * Mirrors Vite's pdfHeaderHtml useMemo in usePublicReaderLayoutState.
 */
export function buildPdfHeaderHtml(model: ReadWorkHeaderModel): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const title = escapeHtml(model.title || "");
  const coverUrl = String(model.coverUrl || "").trim();
  const orgName = model.organization?.name ? escapeHtml(model.organization.name) : "";
  const authorName = model.author?.displayName ? escapeHtml(model.author.displayName) : "";
  const seriesLine = model.series
    ? (() => {
        const name = escapeHtml(model.series.name);
        const order = model.series.order;
        const orderLabel =
          order === 0 ? "設定／背景" : typeof order === "number" ? `第 ${order} 部` : "";
        return orderLabel ? `${name} · ${orderLabel}` : name;
      })()
    : "";

  const coverHtml = coverUrl
    ? `<img src="${escapeHtml(coverUrl)}" alt="cover" style="max-width:180px;max-height:260px;display:block;margin:0 auto 12px;" />`
    : "";

  const metaLines = [orgName, authorName, seriesLine].filter(Boolean);
  const metaHtml = metaLines
    .map((line) => `<p style="margin:2px 0;font-size:12pt;color:#555;">${line}</p>`)
    .join("");

  return `
<div style="text-align:center;padding-bottom:24px;border-bottom:1px solid #ddd;margin-bottom:24px;">
  ${coverHtml}
  <h1 style="font-size:20pt;margin:0 0 8px;">${title}</h1>
  ${metaHtml}
</div>`.trim();
}
