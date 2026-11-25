import type { ReactNode } from "react";
import { ArrowUpRight, Clapperboard, FileText, Gamepad2, Headphones } from "lucide-react";
import { PublicContentLink, PublicMetadataLabel } from "./PublicDirectoryDetails";
import { PublicAvatarImage } from "./PublicAvatarImage";
import type { MediaCropLike } from "@write/media-crop";
import { CoverPlaceholder, CoverRenderer, type CoverDesign } from "@write/public-ui";
import { PublicImage } from "./PublicImage";

/** The same profile frame is used by writers, voice actors, and production resources. */
export function PublicProfileContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">{children}</div>;
}

export function PublicProfileCard({ children, overlap = false }: { children: ReactNode; overlap?: boolean }) {
  return <div className={`mb-5 border-b border-border pb-4 sm:mb-6 ${overlap ? "pt-3" : "pt-4"}`}>{children}</div>;
}

export function PublicProfileAvatar({ name, src, crop }: { name: string; src?: string | null; crop?: MediaCropLike | null }) {
  return <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:h-20 sm:w-20">
    <PublicAvatarImage src={src} name={name} crop={crop} sizes="(min-width: 640px) 80px, 56px" />
  </div>;
}

export function PublicProfileRole({ children, href }: { children: ReactNode; href?: string }) {
  const role = <PublicMetadataLabel>{children}</PublicMetadataLabel>;
  return href ? <PublicContentLink href={href} className="text-xs">{role}</PublicContentLink> : <span className="text-xs">{role}</span>;
}

export function PublicProfileLink({ label, url }: { label: string; url: string }) {
  return <PublicContentLink href={url} target="_blank" rel="noopener noreferrer" appearance="source" className="text-sm" arrow>{label}</PublicContentLink>;
}

export function PublicProfileSection({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return <section className="mb-5 sm:mb-6" aria-label={title}>
    <div className="section-bar mb-2.5 flex items-baseline gap-2"><h2 className="text-base font-bold">{title}</h2>{count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}</div>
    {children}
  </section>;
}

export interface PublicProfileWorkCardProps {
  title: string; url: string; coverUrl?: string | null; subtitle?: string;
  coverCrop?: MediaCropLike | null;
  coverDesign?: CoverDesign | null;
  workType?: "audio" | "game" | "video" | "other" | "script"; compact?: boolean; sourceLabel?: string; linkLabel?: string;
}

export function PublicProfileWorkCard({
  title, url, coverUrl, coverCrop, coverDesign, subtitle, workType, compact = false, sourceLabel, linkLabel,
}: PublicProfileWorkCardProps) {
  const Container = url ? "a" : "article";
  const Icon = workType === "game" ? Gamepad2 : workType === "video" ? Clapperboard : workType === "other" ? FileText : Headphones;
  return <Container {...(url ? { href: url, target: "_blank", rel: "noopener noreferrer", "aria-label": `${linkLabel || "前往作品"}：${title}` } : {})} className="group block min-w-0">
    <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-border bg-muted group-hover:opacity-90">
      {coverUrl ? (
        <PublicImage src={coverUrl} crop={coverCrop} alt={`${title}封面`} preset="script-cover" sizes={compact ? "96px" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"} />
      ) : coverDesign ? (
        <div className="absolute inset-0" aria-hidden="true">
          <CoverRenderer design={coverDesign} title={title} compact responsive responsiveFit="contain" />
        </div>
      ) : workType === "script" ? (
        <div className="absolute inset-0" aria-hidden="true">
          <CoverPlaceholder title={title} compact />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2 text-muted-foreground" aria-label={`${title}尚未提供封面`}>
          <Icon className={compact ? "h-6 w-6" : "h-9 w-9"} aria-hidden />
          {sourceLabel && <span className="text-center text-xs">{sourceLabel}</span>}
        </div>
      )}
    </div>
    <div className={compact ? "pt-1" : "pt-2"}>
      <h3 className={`line-clamp-2 group-hover:text-link group-hover:underline ${compact ? "text-xs leading-snug" : "text-sm font-bold"}`}>{title}</h3>
      {subtitle && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{subtitle}</p>}
      {linkLabel && url && <span className="mt-2 inline-flex items-center gap-1 text-xs text-link">{linkLabel}<ArrowUpRight className="h-3 w-3" aria-hidden /></span>}
    </div>
  </Container>;
}
