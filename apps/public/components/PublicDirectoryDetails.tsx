import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { PublicAvatarImage } from "./PublicAvatarImage";
import { ArrowUpRight, Check, ChevronRight, Play, Tag } from "lucide-react";

type PublicContentLinkProps = ComponentPropsWithoutRef<"a"> & {
  appearance?: "inline" | "title" | "source" | "identity";
  arrow?: boolean;
};

export function PublicContentLink({ children, className = "", appearance = "inline", arrow = false, ...props }: PublicContentLinkProps) {
  return (
    <a {...props} className={`public-content-link public-content-link--${appearance} ${className}`}>
      {children}
      {arrow && <ArrowUpRight className="public-content-link-arrow" aria-hidden />}
      {!arrow && appearance === "identity" && <ChevronRight className="public-identity-link-arrow" aria-hidden />}
    </a>
  );
}

export function PublicPersonLink({ name, avatar, compact = false, className = "", ...props }: Omit<PublicContentLinkProps, "appearance" | "children"> & {
  name: string;
  avatar?: string | null;
  compact?: boolean;
}) {
  return (
    <PublicContentLink {...props} appearance="identity" className={`public-person-link ${compact ? "public-person-link--compact" : ""} ${className}`}>
      <span className="public-person-link-avatar relative shrink-0 overflow-hidden rounded-md bg-muted text-muted-foreground" aria-hidden>
        <PublicAvatarImage src={avatar} name={name} sizes={compact ? "16px" : "20px"} fallbackClassName="bg-muted text-muted-foreground" />
      </span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
    </PublicContentLink>
  );
}

export function PublicActionArrow() {
  return (
    <span className="public-action-arrow" aria-hidden>
      <ChevronRight />
      <ChevronRight />
    </span>
  );
}

export function PublicPlayLink({ children, className = "", ...props }: ComponentPropsWithoutRef<"a">) {
  return (
    <a {...props} className={`public-play-link ${className}`}>
      <span className="public-play-icon" aria-hidden><Play fill="currentColor" /></span>
      <span>{children}</span>
      <span className="public-play-waves" aria-hidden><i /><i /><i /></span>
    </a>
  );
}

export function PublicMetadataLabel({ children }: { children: ReactNode }) {
  return <span className="public-metadata-label">{children}</span>;
}

export function PublicTag({ children }: { children: ReactNode }) {
  return (
    <span className="public-tag">
      <span className="public-tag-icon" aria-hidden><Tag /><Check /></span>
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}
