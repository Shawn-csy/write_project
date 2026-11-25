import type { HTMLAttributes, ReactNode } from "react";
import type { PublicWorkPerformer } from "@/lib/publicWorkPerformers";
import { PublicContentLink, PublicMetadataLabel, PublicPersonLink } from "./PublicDirectoryDetails";
import { LinkifiedText } from "./LinkifiedText";

export function PublicCast({ performers, compact = false }: { performers: PublicWorkPerformer[]; compact?: boolean }) {
  if (!performers.length) return null;
  return (
    <div className={`public-work-cast min-w-0 ${compact ? "public-work-cast--compact" : ""}`}>
      <p className={compact ? "text-xs text-muted-foreground" : "text-sm font-semibold"}>{compact ? "聲演" : "聲演名單"}</p>
      <ul aria-label="聲演名單" className="public-work-cast-list">
        {performers.map((actor) => {
          const href = actor.href || actor.socialUrl;
          const opensSocial = !actor.href && Boolean(actor.socialUrl);
          return (
            <li key={`${actor.name}:${actor.href || ""}:${actor.socialUrl || ""}`} className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                {href ? (
                  <PublicPersonLink href={href} name={actor.name} avatar={actor.avatar} compact={compact} target={opensSocial ? "_blank" : undefined} rel={opensSocial ? "noopener noreferrer" : undefined} arrow={opensSocial} />
                ) : <span className="public-work-cast-name [overflow-wrap:anywhere]">{actor.name}</span>}
                {!compact && actor.href && actor.socialUrl && <PublicContentLink href={actor.socialUrl} target="_blank" rel="noopener noreferrer" aria-label={`${actor.name}社群連結`} className="inline-flex shrink-0 p-1" arrow />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PublicVoiceTypes({ types }: { types?: readonly ("male" | "female")[] }) {
  if (!types?.length) return null;
  return (
    <p className="mt-1.5 text-xs" aria-label="聲演聲線">
      <PublicMetadataLabel>{types.map((type) => type === "male" ? "男聲演" : "女聲演").join("、")}</PublicMetadataLabel>
    </p>
  );
}

export function PublicWorkDetails({
  title, heading = "h3", meta, action, artwork, performers, description, children, className = "", ...props
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: string;
  heading?: "h3" | "h4";
  meta?: ReactNode;
  action?: ReactNode;
  artwork?: ReactNode;
  performers?: PublicWorkPerformer[];
  description?: string;
}) {
  const Heading = heading;
  return (
    <article {...props} className={`public-work-details min-w-0 rounded-xl border border-border bg-card p-2.5 sm:p-3.5 ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-[1_1_9rem]">
          <Heading className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">{title}</Heading>
          {meta}
        </div>
        {action}
      </header>
      {(artwork || Boolean(performers?.length)) && (
        <div className="public-work-details-media mt-2.5 border-t border-border pt-2.5">
          {artwork && <div className="public-work-artwork min-w-0 self-start">{artwork}</div>}
          {performers && <PublicCast performers={performers} />}
        </div>
      )}
      {description && <LinkifiedText text={description} className="mt-2.5 whitespace-pre-wrap border-t border-border pt-2.5 text-sm leading-7 text-foreground/85 [overflow-wrap:anywhere]" />}
      {children}
    </article>
  );
}
