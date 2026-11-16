import type { ReactNode } from "react";
import { ArrowUpRight, Clapperboard, FileText, Gamepad2, Headphones } from "lucide-react";
import { PublicAvatarImage } from "./PublicAvatarImage";
import type { MediaCropLike } from "@write/media-crop";
import { PublicImage } from "./PublicImage";

/** The same profile frame is used by writers, voice actors, and production resources. */
export function PublicProfileContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">{children}</div>;
}

export function PublicProfileCard({ children, overlap = false }: { children: ReactNode; overlap?: boolean }) {
  return <div className={`mb-8 border-b border-border pb-6 ${overlap ? "pt-5" : "pt-6"}`}>{children}</div>;
}

export function PublicProfileAvatar({ name, src, crop }: { name: string; src?: string | null; crop?: MediaCropLike | null }) {
  return <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:h-28 sm:w-28">
    <PublicAvatarImage src={src} name={name} crop={crop} sizes="144px" />
  </div>;
}

export function PublicProfileRole({ children, href }: { children: ReactNode; href?: string }) {
  const className = "rounded-sm bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground";
  return href ? <a href={href} className={className}>{children}</a> : <span className={className}>{children}</span>;
}

export function PublicProfileLink({ label, url }: { label: string; url: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className="tap-grow inline-flex items-center gap-0.5 text-sm text-link hover:underline">{label}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></a>;
}

export function PublicProfileSection({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return <section className="mb-8" aria-label={title}>
    <div className="section-bar mb-4 flex items-baseline gap-2"><h2 className="text-[17px] font-bold">{title}</h2>{count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}</div>
    {children}
  </section>;
}

export function PublicProfileWorkCard({ title, url, coverUrl, subtitle, workType }: { title: string; url: string; coverUrl?: string | null; subtitle?: string; workType?: "audio" | "game" | "video" | "other" }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className="group block" aria-label={`前往作品：${title}`}>
    <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-border bg-muted group-hover:opacity-90">
      {coverUrl ? <PublicImage src={coverUrl} alt={`${title}封面`} preset="script-cover" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" /> : workType === "game" ? <Gamepad2 className="absolute inset-0 m-auto h-9 w-9 text-muted-foreground" aria-hidden /> : workType === "video" ? <Clapperboard className="absolute inset-0 m-auto h-9 w-9 text-muted-foreground" aria-hidden /> : workType === "other" ? <FileText className="absolute inset-0 m-auto h-9 w-9 text-muted-foreground" aria-hidden /> : <Headphones className="absolute inset-0 m-auto h-9 w-9 text-muted-foreground" aria-hidden />}
    </div>
    <div className="pt-2"><h3 className="line-clamp-2 text-sm font-bold group-hover:text-link group-hover:underline">{title}</h3>{subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}</div>
  </a>;
}
