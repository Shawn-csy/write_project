/**
 * GalleryServerContent — pure server component.
 *
 * Renders the initial script card grid from SSR data so the initial HTML
 * contains /read/[id] links for Googlebot without requiring client-side
 * JavaScript or useSearchParams().
 *
 * This component has no interactivity. GalleryClient mounts after hydration
 * and takes over the interactive gallery, hiding this static grid.
 */

import type { PublicScript } from "@/lib/types";

interface Props {
  scripts: PublicScript[];
}

export function GalleryServerContent({ scripts }: Props) {
  if (scripts.length === 0) return null;

  return (
    <div
      data-gallery-ssr
      className="grid gap-5 sm:gap-6"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))" }}
    >
      {scripts.map((script) => {
        const authorName =
          script.persona?.displayName ?? script.owner?.displayName ?? null;
        return (
          <article key={script.id}>
            <a
              href={`/read/${script.id}`}
              className="block group rounded-xl overflow-hidden border border-border/40 bg-card hover:border-primary/40 transition-colors"
            >
              {script.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={script.coverUrl}
                  alt={script.title}
                  className="w-full aspect-[3/4] object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-muted/30 flex items-center justify-center">
                  <span className="text-muted-foreground text-xs px-2 text-center line-clamp-3">
                    {script.title}
                  </span>
                </div>
              )}
              <div className="p-2.5">
                <p className="text-xs font-medium line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                  {script.title}
                </p>
                {authorName && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {authorName}
                  </p>
                )}
              </div>
            </a>
          </article>
        );
      })}
    </div>
  );
}
