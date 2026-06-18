import type { Metadata } from "next";
import type { PublicScript } from "./types";
import { getScriptDescription } from "./scriptDescription";
import { BASE_URL, SITE_NAME, pickPreviewImage, absoluteUrl } from "./seo";

// ── helpers ────────────────────────────────────────────────────────────────

function getAuthorName(script: PublicScript): string {
  return script.persona?.displayName ?? script.owner?.displayName ?? "";
}

function parseDateModified(script: PublicScript): string | undefined {
  const raw = script.updatedAt ?? script.lastModified;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    try { return new Date(raw).toISOString(); } catch { /* noop */ }
  } else if (typeof raw === "string" && raw.trim()) {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return undefined;
}

// ── public API ─────────────────────────────────────────────────────────────

export function buildReadPageCanonicalUrl(scriptId: string): string {
  return `${BASE_URL}/read/${scriptId}`;
}

export function buildReadPageTitle(script: PublicScript): string {
  const series = script.series;
  const order = script.seriesOrder;

  if (series?.name) {
    if (typeof order === "number") {
      if (order === 0) {
        return `${series.name} 設定／背景：${script.title}｜Screenplay Reader`;
      }
      return `${series.name} 第 ${order} 部：${script.title}｜Screenplay Reader`;
    }
    return `${script.title}｜${series.name}｜Screenplay Reader`;
  }

  const authorName = getAuthorName(script);
  if (authorName) {
    return `${script.title}｜${authorName}｜Screenplay Reader`;
  }

  return `${script.title}｜Screenplay Reader`;
}

export function buildReadPageDescription(script: PublicScript): string {
  const base = getScriptDescription(script);
  if (base !== "公開劇本閱讀頁") return base;

  // series-aware fallback
  const series = script.series;
  const order = script.seriesOrder;
  const authorName = getAuthorName(script);

  if (series?.name) {
    const orderPart =
      typeof order === "number" && order > 0 ? `第 ${order} 部，` : "";
    const authorPart = authorName ? `作者 ${authorName} 的` : "";
    return `${series.name}${orderPart}${authorPart}公開台本。`;
  }

  if (authorName) {
    return `${authorName} 的公開台本。`;
  }

  return base;
}

export function buildReadPageStructuredData(
  script: PublicScript,
  scriptId: string,
): Record<string, unknown> {
  const canonicalUrl = buildReadPageCanonicalUrl(scriptId);
  const authorName = getAuthorName(script);
  const tags = (script.tags ?? []).map((t) => t.name).filter(Boolean);
  const dateModified = parseDateModified(script);
  const description = buildReadPageDescription(script);

  const isPartOf =
    script.series?.name
      ? {
          "@type": "CreativeWorkSeries",
          name: script.series.name,
          url: `${BASE_URL}/series/${encodeURIComponent(script.series.name)}`,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: script.title,
    headline: script.title,
    url: canonicalUrl,
    inLanguage: "zh-Hant",
    description,
    isAccessibleForFree: true,
    ...(tags.length > 0 && { genre: tags }),
    ...(dateModified && { dateModified }),
    ...(authorName && { author: { "@type": "Person", name: authorName } }),
    ...(script.organization?.name && {
      publisher: { "@type": "Organization", name: script.organization.name },
    }),
    ...(script.coverUrl && { image: absoluteUrl(script.coverUrl) }),
    ...(isPartOf && { isPartOf }),
    ...(isPartOf &&
      typeof script.seriesOrder === "number" && { position: script.seriesOrder }),
  };
}

export function buildReadPageBreadcrumbData(
  script: PublicScript,
  scriptId: string,
): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = [
    {
      "@type": "ListItem",
      position: 1,
      name: "首頁",
      item: BASE_URL,
    },
  ];

  if (script.series?.name) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: script.series.name,
      item: `${BASE_URL}/series/${encodeURIComponent(script.series.name)}`,
    });
    items.push({
      "@type": "ListItem",
      position: 3,
      name: script.title,
      item: buildReadPageCanonicalUrl(scriptId),
    });
  } else {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: script.title,
      item: buildReadPageCanonicalUrl(scriptId),
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export function buildReadPageOpenGraph(
  script: PublicScript,
  scriptId: string,
): Metadata["openGraph"] {
  const title = buildReadPageTitle(script);
  const description = buildReadPageDescription(script);
  const canonicalUrl = buildReadPageCanonicalUrl(scriptId);
  const previewImage = pickPreviewImage(script.coverUrl);

  return {
    type: "article",
    title,
    description,
    url: canonicalUrl,
    siteName: SITE_NAME,
    locale: "zh_TW",
    images: [{ url: previewImage, alt: script.title }],
  };
}

export function buildReadPageTwitterCard(script: PublicScript): Metadata["twitter"] {
  const title = buildReadPageTitle(script);
  const description = buildReadPageDescription(script);
  const previewImage = pickPreviewImage(script.coverUrl);

  return {
    card: "summary_large_image",
    title,
    description,
    images: [previewImage],
  };
}
