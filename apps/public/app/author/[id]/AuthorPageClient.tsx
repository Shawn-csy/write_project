"use client";

import type { PublicPersona, PublicScript } from "@/lib/types";

interface Props {
  persona: PublicPersona;
  scripts: PublicScript[];
}

function parseLinks(links: PublicPersona["links"]): Array<{ url?: string; label?: string }> {
  if (Array.isArray(links)) return links;
  if (typeof links === "string") {
    try {
      const parsed = JSON.parse(links);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function AuthorPageClient({ persona, scripts }: Props) {
  const links = parseLinks(persona.links);

  return (
    <main className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-r from-slate-900 to-slate-700 overflow-hidden">
        {persona.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={persona.bannerUrl} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Profile header */}
        <div className="relative -mt-16 mb-8 rounded-xl border border-border/60 bg-background p-6 shadow-sm md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-background bg-muted overflow-hidden shrink-0 shadow">
              {persona.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={persona.avatar} alt={persona.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                  {persona.displayName?.[0]}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 pt-2">
              <h1 className="text-3xl font-bold">{persona.displayName}</h1>
              {persona.bio && (
                <p className="text-foreground/85 leading-relaxed max-w-2xl">{persona.bio}</p>
              )}
              {persona.tags && persona.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {persona.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {persona.website && (
                  <a href={persona.website} target="_blank" rel="noreferrer" className="hover:text-foreground underline">
                    {persona.website}
                  </a>
                )}
                {links.filter((l) => l.url).map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noreferrer" className="hover:text-foreground underline">
                    {link.label || link.url}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scripts */}
        <section className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
            <h2 className="text-xl font-bold">公開作品</h2>
            <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
              {scripts.length}
            </span>
          </div>
          {scripts.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">目前沒有公開作品</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {scripts.map((script) => (
                <a
                  key={script.id}
                  href={`/read/${script.id}`}
                  className="group rounded-lg border border-border/60 bg-background hover:border-primary/50 transition-colors overflow-hidden"
                >
                  {script.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={script.coverUrl}
                      alt={script.title}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {script.title}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
