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
  return <div className={`relative mb-8 rounded-xl border border-border/60 bg-card p-6 shadow-sm md:p-8 ${overlap ? "-mt-16" : "mt-6"}`}>{children}</div>;
}

export function PublicProfileAvatar({ name, src, crop }: { name: string; src?: string | null; crop?: MediaCropLike | null }) {
  return <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow sm:h-36 sm:w-36">
    <PublicAvatarImage src={src} name={name} crop={crop} sizes="144px" />
  </div>;
}

export function PublicProfileRole({ children, href }: { children: ReactNode; href?: string }) {
  const className = "rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20";
  return href ? <a href={href} className={className}>{children}</a> : <span className={className}>{children}</span>;
}

export function PublicProfileLink({ label, url }: { label: string; url: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 text-sm font-medium text-primary hover:border-primary/40 hover:bg-primary/5">{label}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></a>;
}

export function PublicProfileSection({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return <section className="mb-6 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6" aria-label={title}>
    <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3"><h2 className="text-xl font-bold">{title}</h2>{count !== undefined && <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{count}</span>}</div>
    {children}
  </section>;
}

export function PublicProfileWorkCard({ title, url, coverUrl, subtitle, workType }: { title: string; url: string; coverUrl?: string | null; subtitle?: string; workType?: "audio" | "game" | "video" | "other" }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-xl border border-border/60 bg-card transition-colors hover:border-primary/40" aria-label={`前往作品：${title}`}>
    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
      {coverUrl ? <PublicImage src={coverUrl} alt={`${title}封面`} preset="script-cover" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" /> : workType === "game" ? <Gamepad2 className="absolute inset-0 m-auto h-9 w-9 text-muted-foreground/60" aria-hidden /> : workType === "video" ? <Clapperboard className="absolute inset-0 m-auto h-9 w-9 text-muted-foreground/60" aria-hidden /> : workType === "other" ? <FileText className="absolute inset-0 m-auto h-9 w-9 text-muted-foreground/60" aria-hidden /> : <Headphones className="absolute inset-0 m-auto h-9 w-9 text-muted-foreground/60" aria-hidden />}
    </div>
    <div className="p-3"><h3 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">{title}</h3>{subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}</div>
  </a>;
}
