import type { EnrichedGalleryScript, PublicGalleryEntry, ScriptNavigationPolicy } from "@write/public-ui";
import type { ExternalPublicScript } from "@/lib/types";
import { externalCoverSrc } from "@/lib/externalCover";
import { externalEntityHref } from "@/lib/externalEntity";
import { externalScriptCardDetails } from "@/lib/externalScriptCard";

export type MixedGalleryEntry =
  | { kind: "external"; item: ExternalPublicScript }
  | { kind: "external-series"; entry: Extract<PublicGalleryEntry, { type: "series" }> }
  | { kind: "gallery"; entry: PublicGalleryEntry };

export interface RecommendationCardData {
  id: string;
  title: string;
  href: string;
  external: boolean;
  author: string;
  authorHref?: string;
  summary: string;
  outline: string;
  coverUrl?: string;
  coverCrop?: EnrichedGalleryScript["coverCrop"];
  coverDesign?: EnrichedGalleryScript["coverDesign"];
  showAgeGate: boolean;
  demoHref?: string;
  chapterCount?: number;
  externalViewId?: string;
}

function demoHref(script: EnrichedGalleryScript) {
  return script.hasDemo
    ? `/demos?script=${encodeURIComponent(script.id.startsWith("external:") ? script.id : `internal:${script.id}`)}`
    : undefined;
}
function authorName(script: EnrichedGalleryScript) {
  return typeof script.author === "object" ? script.author?.displayName || "" : script.author || "";
}
function localAuthorHref(script: EnrichedGalleryScript) {
  return !script._disableAuthorLink && typeof script.author === "object" && script.author?.id
    ? `/author/${script.author.id}` : undefined;
}
function text(value: unknown): string { return String(value || "").replace(/\s+/g, " ").trim(); }

/** Project the existing navigation/card contracts without importing large-card UI. */
export function projectRecommendation(entry: MixedGalleryEntry, policies: Map<string, ScriptNavigationPolicy>): RecommendationCardData {
  if (entry.kind === "external") {
    const item = entry.item;
    const detail = externalScriptCardDetails(item);
    return {
      id: `external:${item.id}`, title: detail.title, href: item.sourceUrl, external: true,
      author: detail.authorName, authorHref: detail.authorHref,
      summary: text(detail.summary), outline: detail.summary,
      coverUrl: externalCoverSrc(item), showAgeGate: detail.showAgeGate,
      demoHref: detail.hasDemo ? `/demos?script=${encodeURIComponent(`external:${item.id}`)}` : undefined,
      externalViewId: item.id,
    };
  }
  const gallery = entry.entry;
  if (gallery.type === "series") {
    const lead = gallery.leadScript;
    const name = authorName(lead);
    const profileUrl = typeof lead.author === "object" ? String(lead.author?.profileUrl || "") : "";
    const summary = text(gallery.summary || lead._cardSummary || lead.synopsis);
    const demo = gallery.scripts.find((script) => script.hasDemo);
    return {
      id: `${entry.kind === "external-series" ? "external-series" : "series"}:${gallery.key}`,
      title: gallery.name, href: `/series/${encodeURIComponent(gallery.name)}`, external: false,
      author: name,
      authorHref: lead._disableAuthorLink ? undefined : entry.kind === "external-series"
        ? (name ? externalEntityHref("author", name, profileUrl) : undefined)
        : localAuthorHref(lead),
      summary, outline: lead._hoverOutline || String(lead.outline || "") || summary,
      coverUrl: gallery.coverUrl || lead.coverUrl, coverDesign: lead.coverDesign,
      showAgeGate: gallery.hasAgeGate, chapterCount: gallery.scripts.length,
      demoHref: demo ? demoHref(demo) : undefined,
    };
  }
  const script = gallery.script;
  const summary = text(script._cardSummary || script.synopsis);
  return {
    id: script.id, title: script.title || "未命名台本", href: `/read/${script.id}`, external: false,
    author: authorName(script), authorHref: localAuthorHref(script),
    summary, outline: script._hoverOutline || String(script.outline || "") || summary,
    coverUrl: script.coverUrl, coverCrop: script.coverCrop, coverDesign: script.coverDesign,
    showAgeGate: policies.get(script.id)?.showGateIndicator ?? false,
    demoHref: demoHref(script),
  };
}
