"use client";

import { ScriptGalleryCard, type CoverImageRenderer } from "@write/public-ui";
import { formatPublicCardDate } from "@write/public-ui/public-date";
import type { ExternalPublicScript } from "@/lib/types";
import { externalEntityHref, socialAvatarUrl } from "@/lib/externalEntity";
import { CardMediaImage } from "@/components/CardMediaVisibility";
import { publicCardAvatarRenderer } from "@/components/PublicCardAvatar";
import { externalCoverSrc } from "@/lib/externalCover";
import { hasValidDemoLink } from "@/lib/galleryProjection";

const externalCoverImageRenderer: CoverImageRenderer = ({ src, crop, alt, className }) => (
  <CardMediaImage
    src={src}
    crop={crop}
    alt={alt}
    preset="script-cover"
    className={className}
  />
);

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
  organizationHref,
}: {
  item: ExternalPublicScript;
  variant?: "standard" | "compact" | "dense" | "list";
  onTagClick?: (tag: string) => void;
  organizationHref?: string;
}) {
  const title = item.title || item.remoteTitle || item.sourceDomain || "未命名台本";
  const summary = item.summary || item.remoteSummary || "";
  const mountedAt = item.mountedAt || item.createdAt;
  const date = formatPublicCardDate(mountedAt);
  const authorName = item.authorName || item.organizationName || "";
  const authorHref = item.authorName
    ? (item.authorPersonaId ? `/author/${encodeURIComponent(item.authorPersonaId)}` : externalEntityHref("author", item.authorName, item.authorUrl))
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
        hasDemo: Boolean(item.hasDemo || hasValidDemoLink(item.demoLinks)),
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
      organizationHref={organizationHref || (item.organizationName ? externalEntityHref("org", item.organizationName, item.organizationUrl) : undefined)}
      seriesHref={seriesName ? `/series/${encodeURIComponent(seriesName)}` : undefined}
      onView={() => trackExternalView(item.id)}
      onTagClick={onTagClick}
      coverImageRenderer={externalCoverImageRenderer}
      avatarImageRenderer={publicCardAvatarRenderer}
    />
  );
}
