/**
 * ScriptCard — shared script card for public SSR pages.
 * Server-renderable: uses <a> tags, no client hooks.
 */

import { PublicImage } from "@/components/PublicImage";

interface Tag {
  id?: string;
  name: string;
}

interface SeriesInfo {
  name?: string;
  coverUrl?: string;
}

export interface ScriptCardData {
  id: string;
  title: string;
  coverUrl?: string | null;
  coverCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  synopsis?: string | null;
  tags?: Tag[];
  views?: number;
  likes?: number;
  seriesOrder?: number | null;
  series?: SeriesInfo | null;
  persona?: { id?: string; displayName?: string; avatar?: string } | null;
  owner?: { id?: string; displayName?: string } | null;
  organization?: { id?: string; name?: string } | null;
}

interface Props {
  script: ScriptCardData;
  /** Override href — defaults to /read/:id */
  href?: string;
}

function getAuthorName(script: ScriptCardData): string {
  return script.persona?.displayName ?? script.owner?.displayName ?? "";
}

export function ScriptCard({ script, href }: Props) {
  const tags = (script.tags ?? []).slice(0, 3);
  const authorName = getAuthorName(script);
  const readTarget = href ?? `/read/${script.id}`;
  // Only link /author/:id when persona.id exists — /author route is persona-scoped
  const authorHref = script.persona?.id ? `/author/${script.persona.id}` : null;
  const seriesHref = script.series?.name
    ? `/series/${encodeURIComponent(script.series.name)}`
    : null;
  const orgHref = script.organization?.id ? `/org/${script.organization.id}` : null;

  return (
    <article className="flex flex-col rounded-xl border border-border/60 bg-background overflow-hidden hover:border-primary/50 hover:shadow-sm transition-all">
      {/* Cover — full clickable area to read */}
      <a href={readTarget} className="group block aspect-[2/3] bg-muted relative overflow-hidden">
        {script.coverUrl ? (
          <PublicImage
            src={script.coverUrl}
            alt={script.title}
            preset="script-cover"
            crop={script.coverCrop}
            className="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3">
            <span className="text-xs text-muted-foreground text-center line-clamp-4 leading-relaxed">
              {script.title}
            </span>
          </div>
        )}
        {script.seriesOrder != null && (
          <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
            #{script.seriesOrder}
          </div>
        )}
      </a>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <a
          href={readTarget}
          className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors leading-snug"
        >
          {script.title}
        </a>

        {authorName && (
          authorHref ? (
            <a href={authorHref} className="text-xs text-muted-foreground line-clamp-1 hover:text-foreground transition-colors">
              {authorName}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground line-clamp-1">{authorName}</p>
          )
        )}

        {script.series?.name && (
          seriesHref ? (
            <a href={seriesHref} className="text-xs text-muted-foreground/70 line-clamp-1 hover:text-muted-foreground transition-colors">
              {script.series.name}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground/70 line-clamp-1">{script.series.name}</p>
          )
        )}

        {script.organization?.name && !script.series?.name && (
          orgHref ? (
            <a href={orgHref} className="text-xs text-muted-foreground/70 line-clamp-1 hover:text-muted-foreground transition-colors">
              {script.organization.name}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground/70 line-clamp-1">{script.organization.name}</p>
          )
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {tags.map((tag) => (
              <a
                key={tag.id ?? tag.name}
                href={`/tag/${encodeURIComponent(tag.name)}`}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                {tag.name}
              </a>
            ))}
          </div>
        )}

        {/* Stats */}
        {((script.views ?? 0) > 0 || (script.likes ?? 0) > 0) && (
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/70 border-t border-border/40 pt-1">
            {(script.views ?? 0) > 0 && <span>👁 {script.views}</span>}
            {(script.likes ?? 0) > 0 && <span>♥ {script.likes}</span>}
          </div>
        )}
      </div>
    </article>
  );
}
