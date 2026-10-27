"use client";

import { ScriptGalleryCard, type CoverImageRenderer } from "@write/public-ui";
import type { ExternalPublicScript } from "@/lib/types";
import { externalEntityHref, socialAvatarUrl } from "@/lib/externalEntity";
import { PublicImage } from "@/components/PublicImage";
import { externalCoverSrc } from "@/lib/externalCover";

const externalCoverImageRenderer: CoverImageRenderer = ({ src, crop, alt, className }) => (
  <PublicImage
    src={src}
    crop={crop}
    alt={alt}
    preset="script-cover"
    className={className}
  />
);

function toTimestamp(value?: number | string | null): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: number | string | null): { label?: string; time?: string } {
  const timestamp = toTimestamp(value);
  if (!timestamp || timestamp <= 0) return {};
  const date = new Date(timestamp);
  return {
    label: new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).format(date),
    time: date.toISOString(),
  };
}

function normalizeCategories(categories: string[] | undefined): string[] {
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

function hasAdultCategory(categories: string[] | undefined): boolean {
  return normalizeCategories(categories).some((category) => ADULT_CATEGORY_TAGS.has(category.toLocaleLowerCase()));
}

function trackExternalView(id: string): void {
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

export function ExternalPublicScriptCard({
  item,
  variant = "standard",
  onTagClick,
}: {
  item: ExternalPublicScript;
  variant?: "standard" | "compact" | "list";
  onTagClick?: (tag: string) => void;
}) {
  const title = item.title || item.remoteTitle || item.sourceDomain || "外部公開台本";
  const summary = item.summary || item.remoteSummary || "";
  const mountedAt = item.mountedAt || item.createdAt;
  const date = formatDate(mountedAt);
  const authorName = item.authorName || item.organizationName || "";
  const authorHref = item.authorName
    ? externalEntityHref("author", item.authorName, item.authorUrl)
    : item.organizationName
      ? externalEntityHref("org", item.organizationName, item.organizationUrl)
      : undefined;
  const avatarUrl = item.authorName
    ? item.authorAvatarUrl || socialAvatarUrl(item.authorUrl)
    : item.organizationAvatarUrl || socialAvatarUrl(item.organizationUrl);
  const seriesName = item.seriesName?.trim() || "";

  return (
    <ScriptGalleryCard
      script={{
        id: `external:${item.id}`,
        title,
        synopsis: summary,
        coverUrl: externalCoverSrc(item),
        tags: normalizeCategories(item.categories),
        seriesName,
        seriesOrder: item.seriesOrder,
        author: authorName
          ? {
              displayName: authorName,
              avatarUrl,
            }
          : null,
        views: item.views,
        organization: item.organizationName
          ? {
              name: item.organizationName,
              logoUrl: item.organizationAvatarUrl || socialAvatarUrl(item.organizationUrl),
            }
          : null,
        dateLabel: date.label,
        dateTime: date.time,
      }}
      variant={variant}
      scriptHref={item.sourceUrl}
      scriptTarget="_blank"
      showAgeGate={hasAdultCategory(item.categories)}
      authorHref={authorHref}
      organizationHref={item.organizationName ? externalEntityHref("org", item.organizationName, item.organizationUrl) : undefined}
      seriesHref={seriesName ? `/series/${encodeURIComponent(seriesName)}` : undefined}
      onView={() => trackExternalView(item.id)}
      onTagClick={onTagClick}
      coverImageRenderer={externalCoverImageRenderer}
    />
  );
}
