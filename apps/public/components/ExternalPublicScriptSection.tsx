"use client";

import { ScriptGalleryCard, type CoverImageRenderer } from "@write/public-ui";
import { formatPublicCardDate } from "@write/public-ui/public-date";
import type { ExternalPublicScript } from "@/lib/types";
import { externalEntityHref, socialAvatarUrl } from "@/lib/externalEntity";
import { CardMediaImage } from "@/components/CardMediaVisibility";
import { publicCardAvatarRenderer } from "@/components/PublicCardAvatar";
import { externalCoverSrc } from "@/lib/externalCover";
import { externalScriptCardDetails, trackExternalView } from "@/lib/externalScriptCard";

const externalCoverImageRenderer: CoverImageRenderer = ({ src, crop, alt, className }) => (
  <CardMediaImage
    src={src}
    crop={crop}
    alt={alt}
    preset="script-cover"
    className={className}
  />
);

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
  const { title, summary, authorName, authorHref, hasDemo, showAgeGate, categories } = externalScriptCardDetails(item);
  const mountedAt = item.mountedAt || item.createdAt;
  const date = formatPublicCardDate(mountedAt);
  const avatarUrl = item.authorName
    ? item.authorAvatarUrl || socialAvatarUrl(item.authorUrl)
    : item.organizationAvatarUrl || socialAvatarUrl(item.organizationUrl);
  const seriesName = item.seriesName?.trim() || "";

  return (
    <ScriptGalleryCard
      script={{
        id: `external:${item.id}`,
        hasDemo: hasDemo,
        title,
        synopsis: summary,
        coverUrl: externalCoverSrc(item),
        tags: categories,
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
      showAgeGate={showAgeGate}
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
