"use client";

import type { PublicOrg, PublicScript } from "@/lib/types";

interface Props {
  org: PublicOrg;
  scripts: PublicScript[];
}

export function OrgPageClient({ org, scripts }: Props) {
  const members = org.members ?? [];

  return (
    <main className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-r from-blue-900 to-slate-900 overflow-hidden">
        {org.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.bannerUrl} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Org header */}
        <div className="relative -mt-16 mb-8 rounded-xl border border-border/60 bg-background p-6 shadow-sm md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg border-4 border-background bg-muted overflow-hidden shrink-0 shadow">
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                  {org.name?.[0]}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 pt-2">
              <h1 className="text-3xl font-bold">{org.name}</h1>
              {org.description && (
                <p className="text-foreground/85 leading-relaxed max-w-2xl">{org.description}</p>
              )}
              {org.tags && org.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {org.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {org.website && (
                <a href={org.website} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                  {org.website}
                </a>
              )}
              <p className="text-sm text-muted-foreground">{members.length} 位成員</p>
            </div>
          </div>
        </div>

        {/* Scripts */}
        <section className="mb-6 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
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
                    <img src={script.coverUrl} alt={script.title} className="w-full aspect-[2/3] object-cover" />
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

        {/* Members */}
        {members.length > 0 && (
          <section className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
            <h2 className="text-xl font-bold border-b border-border/60 pb-3 mb-4">成員</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {members.map((member) => (
                <a
                  key={member.id}
                  href={`/author/${member.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                    {member.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.avatar} alt={member.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {member.displayName?.[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium">{member.displayName}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
