import type { ExternalPublicScript } from "./types";
import { cleanScriptSummary } from "./scriptSummary";
import { externalEntityHref } from "./externalEntity";
import { hasValidDemoLink } from "./galleryProjection";

export function normalizeCategories(categories: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (categories || []).flatMap((category) =>
        String(category || "")
          .split(/[,，、]/)
          .map((value) => value.trim())
          .filter(Boolean)
      )
    )
  );
}

const ADULT_CATEGORY_TAGS = new Set(["成人向", "r-18", "r18", "18+", "18禁"]);

export function hasAdultCategory(categories: string[] | undefined): boolean {
  return normalizeCategories(categories).some((category) => ADULT_CATEGORY_TAGS.has(category.toLocaleLowerCase()));
}

export function trackExternalView(id: string): void {
  if (typeof window === "undefined" || !id) return;
  const url = `/api/public-external-scripts/${encodeURIComponent(id)}/view`;
  const body = JSON.stringify({});
  try {
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // Fall through to keepalive fetch for browsers that reject sendBeacon blobs.
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {});
}

export function externalScriptCardDetails(item: ExternalPublicScript) {
  const authorName = item.authorName || item.organizationName || "";
  const authorHref = item.authorName
    ? (item.authorPersonaId ? `/author/${encodeURIComponent(item.authorPersonaId)}` : externalEntityHref("author", item.authorName, item.authorUrl))
    : item.organizationName
      ? externalEntityHref("org", item.organizationName, item.organizationUrl)
      : undefined;
  return {
    title: item.title || item.remoteTitle || item.sourceDomain || "未命名台本",
    summary: cleanScriptSummary(item.summary || item.remoteSummary),
    authorName,
    authorHref,
    hasDemo: Boolean(item.hasDemo || hasValidDemoLink(item.demoLinks)),
    showAgeGate: hasAdultCategory(item.categories),
    categories: normalizeCategories(item.categories),
  };
}
