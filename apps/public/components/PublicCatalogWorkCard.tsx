import type { HTMLAttributes, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { PublicContentLink } from "./PublicDirectoryDetails";

type Props = Omit<HTMLAttributes<HTMLElement>, "title" | "children"> & {
  title: string;
  heading?: "h2" | "h3";
  href: string;
  titleHref?: string;
  sourceLabel: string;
  artwork: ReactNode;
  hasArtwork: boolean;
  linkArtwork?: boolean;
  children?: ReactNode;
  details?: ReactNode;
  detailsLabel?: string;
};

export function PublicCatalogWorkCard({
  title, heading: Heading = "h3", href, titleHref, sourceLabel, artwork, hasArtwork, linkArtwork,
  children, details, detailsLabel = "製作人員與介紹", className = "", ...props
}: Props) {
  const artworkClass = "relative block aspect-[4/3] min-w-0 self-start overflow-hidden rounded-md bg-muted";
  const externalLink = { href, target: "_blank", rel: "noopener noreferrer" };
  const resolvedTitleHref = titleHref || href;
  const isInternalTitle = resolvedTitleHref.startsWith("/");
  const titleLinkProps = isInternalTitle
    ? { href: resolvedTitleHref }
    : { href: resolvedTitleHref, target: "_blank", rel: "noopener noreferrer" };

  return <article {...props} className={`public-catalog-work-card min-w-0 rounded-lg border border-border bg-card p-2.5 sm:p-3.5 ${className}`}>
    <div className="public-catalog-work-lead">
      {linkArtwork
        ? <a
          {...titleLinkProps}
          aria-label={isInternalTitle ? title : `${title} · ${sourceLabel}`}
          data-public-cover={hasArtwork || undefined}
          className={`${artworkClass} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
        >{artwork}</a>
        : <div data-public-cover={hasArtwork || undefined} className={artworkClass}>{artwork}</div>}
      <div className="min-w-0">
        <Heading className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">
          <PublicContentLink {...titleLinkProps} appearance="title">{title}</PublicContentLink>
        </Heading>
        {children}
        <PublicContentLink {...externalLink} appearance="source" className="mt-2 text-xs" arrow>{sourceLabel}</PublicContentLink>
      </div>
    </div>
    {details && <details className="public-native-disclosure mt-2 border-t border-border pt-1.5 text-sm">
      <summary className="public-credit-summary cursor-pointer font-medium">
        <span>{detailsLabel}</span><ChevronDown className="size-4" aria-hidden />
      </summary>
      {details}
    </details>}
  </article>;
}
