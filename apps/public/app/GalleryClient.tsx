"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicScript, PublicPersona, PublicOrg } from "@/lib/types";
import { ScriptGalleryCard, HorizontalScrollLane } from "@write/public-ui";
import type { ScriptGalleryItem } from "@write/public-ui";

interface Props {
  initialScripts: PublicScript[];
}

type Tab = "scripts" | "authors" | "orgs";

// ─── helpers ───────────────────────────────────────────────────────────────

function scriptTags(s: PublicScript): string[] {
  return (s.tags ?? []).map((t) => (typeof t === "string" ? t : t.name)).filter(Boolean);
}

function matchesSearch(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

function toGalleryItem(s: PublicScript): ScriptGalleryItem {
  return {
    id: s.id,
    title: s.title,
    coverUrl: s.coverUrl ?? null,
    coverCrop: s.coverCrop ?? null,
    coverDesign: s.coverDesign ?? null,
    tags: s.tags,
    views: s.views,
    likes: s.likes,
    contentLength: s.contentLength,
    author: s.persona
      ? { id: s.persona.id, displayName: s.persona.displayName, avatar: s.persona.avatar }
      : s.owner
      ? { id: s.owner.id, displayName: s.owner.displayName, avatar: s.owner.avatar }
      : undefined,
    _disableAuthorLink: !s.persona?.id,
    seriesName: s.series?.name,
    seriesOrder: s.seriesOrder,
  };
}

// ─── sub-components ────────────────────────────────────────────────────────

function AuthorCard({ author }: { author: PublicPersona }) {
  return (
    <a
      href={`/author/${author.id}`}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-4 hover:border-primary/50 transition-colors"
    >
      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0">
        {author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatar} alt={author.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
            {author.displayName?.[0]}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{author.displayName}</p>
        {author.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{author.bio}</p>
        )}
      </div>
    </a>
  );
}

function OrgCard({ org }: { org: PublicOrg }) {
  return (
    <a
      href={`/org/${org.id}`}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-4 hover:border-primary/50 transition-colors"
    >
      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
        {org.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
            {org.name?.[0]}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{org.name}</p>
        {org.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{org.description}</p>
        )}
      </div>
    </a>
  );
}

// ─── main component ────────────────────────────────────────────────────────

const CARD_WIDTH = "min-w-[160px] w-[160px] sm:min-w-[180px] sm:w-[180px]";

export function GalleryClient({ initialScripts }: Props) {
  const [tab, setTab] = useState<Tab>("scripts");
  const [searchTerm, setSearchTerm] = useState("");
  const [scripts, setScripts] = useState<PublicScript[]>(initialScripts);
  const [authors, setAuthors] = useState<PublicPersona[]>([]);
  const [orgs, setOrgs] = useState<PublicOrg[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);

  const handleNavigate = useCallback((id: string) => {
    window.location.href = `/read/${id}`;
  }, []);
  const handleSeriesClick = useCallback((name: string) => {
    window.location.href = `/series/${encodeURIComponent(name)}`;
  }, []);
  const handleTagClick = useCallback((tag: string) => {
    window.location.href = `/tag/${encodeURIComponent(tag)}`;
  }, []);
  const handleAuthorClick = useCallback((authorId: string) => {
    window.location.href = `/author/${authorId}`;
  }, []);

  // Re-fetch bundle client-side to get fresh data after hydration
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
    fetch(`${apiBase}/api/public-bundle`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.scripts) {
          setScripts(
            (data.scripts as PublicScript[]).filter((s): s is PublicScript => Boolean(s?.id))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Load people when switching to authors/orgs tab
  useEffect(() => {
    if (tab !== "authors" && tab !== "orgs") return;
    if (authors.length > 0 || orgs.length > 0) return;
    setLoadingPeople(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
    Promise.all([
      fetch(`${apiBase}/api/public-personas`).then((r) => r.ok ? r.json() : []),
      fetch(`${apiBase}/api/public-organizations`).then((r) => r.ok ? r.json() : []),
    ])
      .then(([personaData, orgData]) => {
        setAuthors(Array.isArray(personaData) ? personaData : []);
        setOrgs(Array.isArray(orgData) ? orgData : []);
      })
      .catch(() => {})
      .finally(() => setLoadingPeople(false));
  }, [tab, authors.length, orgs.length]);

  const filteredScripts = useMemo(() => {
    if (!searchTerm.trim()) return scripts;
    const q = searchTerm.trim();
    return scripts.filter(
      (s) =>
        matchesSearch(s.title, q) ||
        matchesSearch(s.synopsis ?? "", q) ||
        matchesSearch(s.persona?.displayName ?? s.owner?.displayName ?? "", q) ||
        scriptTags(s).some((t) => matchesSearch(t, q))
    );
  }, [scripts, searchTerm]);

  const { latestLane, topViewedLane, seriesGroups } = useMemo(() => {
    const sorted = [...scripts].sort((a, b) => (b.updatedAt ? Number(b.updatedAt) : 0) - (a.updatedAt ? Number(a.updatedAt) : 0));
    const latest = sorted.slice(0, 20).map(toGalleryItem);
    const topViewed = [...scripts]
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 20)
      .map(toGalleryItem);
    // Group by series — show series with ≥2 scripts
    const bySeriesMap = new Map<string, PublicScript[]>();
    for (const s of scripts) {
      const name = s.series?.name;
      if (!name) continue;
      const existing = bySeriesMap.get(name) ?? [];
      existing.push(s);
      bySeriesMap.set(name, existing);
    }
    const groups = Array.from(bySeriesMap.entries())
      .filter(([, arr]) => arr.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([name, arr]) => ({
        name,
        items: arr.sort((a, b) => (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999)).map(toGalleryItem),
      }));
    return { latestLane: latest, topViewedLane: topViewed, seriesGroups: groups };
  }, [scripts]);

  const filteredAuthors = useMemo(() => {
    if (!searchTerm.trim()) return authors;
    const q = searchTerm.trim();
    return authors.filter(
      (a) =>
        matchesSearch(a.displayName, q) ||
        matchesSearch(a.bio ?? "", q) ||
        (a.tags ?? []).some((t) => matchesSearch(t, q))
    );
  }, [authors, searchTerm]);

  const filteredOrgs = useMemo(() => {
    if (!searchTerm.trim()) return orgs;
    const q = searchTerm.trim();
    return orgs.filter(
      (o) =>
        matchesSearch(o.name, q) ||
        matchesSearch(o.description ?? "", q) ||
        (o.tags ?? []).some((t) => matchesSearch(t, q))
    );
  }, [orgs, searchTerm]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "scripts", label: "台本" },
    { key: "authors", label: "作者" },
    { key: "orgs", label: "組織" },
  ];

  const resultCount =
    tab === "scripts"
      ? filteredScripts.length
      : tab === "authors"
      ? filteredAuthors.length
      : filteredOrgs.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <span className="font-serif font-bold text-foreground text-base shrink-0">
            Screenplay Reader
          </span>
          {/* Tab nav */}
          <nav className="flex items-center gap-1 ml-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          {/* Search */}
          <div className="flex-1 max-w-xs ml-auto">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                tab === "scripts"
                  ? "搜尋台本..."
                  : tab === "authors"
                  ? "搜尋作者..."
                  : "搜尋組織..."
              }
              className="w-full rounded-full border border-border/70 bg-muted/50 px-4 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          {/* Studio link */}
          <a
            href="/dashboard"
            className="ml-2 hidden sm:inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            工作室
          </a>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        {/* Result count */}
        <p className="text-xs text-muted-foreground mb-4">
          {searchTerm
            ? `搜尋「${searchTerm}」共 ${resultCount} 筆結果`
            : tab === "scripts"
            ? `${resultCount} 部公開台本`
            : tab === "authors"
            ? `${resultCount} 位作者`
            : `${resultCount} 個組織`}
        </p>

        {/* Scripts */}
        {tab === "scripts" && (
          searchTerm.trim() ? (
            // Search results — flat grid
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
            >
              {filteredScripts.map((s) => (
                <ScriptGalleryCard
                  key={s.id}
                  script={toGalleryItem(s)}
                  href={`/read/${s.id}`}
                  authorHref={s.persona?.id ? `/author/${s.persona.id}` : undefined}
                  seriesHref={s.series?.name ? `/series/${encodeURIComponent(s.series.name)}` : undefined}
                  onView={handleNavigate}
                  onSeriesClick={handleSeriesClick}
                  onTagClick={handleTagClick}
                  onAuthorClick={handleAuthorClick}
                />
              ))}
              {filteredScripts.length === 0 && (
                <p className="col-span-full py-16 text-center text-muted-foreground text-sm">
                  找不到符合的台本
                </p>
              )}
            </div>
          ) : (
            // Browse mode — lanes
            <div className="space-y-10">
              {latestLane.length > 0 && (
                <HorizontalScrollLane title="最新上架">
                  {latestLane.map((item) => (
                    <div key={item.id} className={CARD_WIDTH}>
                      <ScriptGalleryCard
                        script={item}
                        href={`/read/${item.id}`}
                        authorHref={typeof item.author === "object" && item.author?.id ? `/author/${item.author.id}` : undefined}
                        seriesHref={item.seriesName ? `/series/${encodeURIComponent(item.seriesName)}` : undefined}
                        onView={handleNavigate}
                        onSeriesClick={handleSeriesClick}
                        onTagClick={handleTagClick}
                        onAuthorClick={handleAuthorClick}
                      />
                    </div>
                  ))}
                </HorizontalScrollLane>
              )}

              {topViewedLane.length > 0 && (
                <HorizontalScrollLane title="熱門閱讀">
                  {topViewedLane.map((item) => (
                    <div key={item.id} className={CARD_WIDTH}>
                      <ScriptGalleryCard
                        script={item}
                        href={`/read/${item.id}`}
                        authorHref={typeof item.author === "object" && item.author?.id ? `/author/${item.author.id}` : undefined}
                        seriesHref={item.seriesName ? `/series/${encodeURIComponent(item.seriesName)}` : undefined}
                        onView={handleNavigate}
                        onSeriesClick={handleSeriesClick}
                        onTagClick={handleTagClick}
                        onAuthorClick={handleAuthorClick}
                      />
                    </div>
                  ))}
                </HorizontalScrollLane>
              )}

              {seriesGroups.map((group) => (
                <HorizontalScrollLane
                  key={group.name}
                  title={group.name}
                  actionLabel="查看系列"
                  onAction={() => handleSeriesClick(group.name)}
                >
                  {group.items.map((item) => (
                    <div key={item.id} className={CARD_WIDTH}>
                      <ScriptGalleryCard
                        script={item}
                        href={`/read/${item.id}`}
                        authorHref={typeof item.author === "object" && item.author?.id ? `/author/${item.author.id}` : undefined}
                        seriesHref={`/series/${encodeURIComponent(group.name)}`}
                        onView={handleNavigate}
                        onSeriesClick={handleSeriesClick}
                        onTagClick={handleTagClick}
                        onAuthorClick={handleAuthorClick}
                      />
                    </div>
                  ))}
                </HorizontalScrollLane>
              ))}

              {scripts.length === 0 && (
                <p className="py-16 text-center text-muted-foreground text-sm">
                  目前沒有公開台本
                </p>
              )}
            </div>
          )
        )}

        {/* Authors */}
        {tab === "authors" && (
          <>
            {loadingPeople ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredAuthors.map((a) => (
                  <AuthorCard key={a.id} author={a} />
                ))}
                {filteredAuthors.length === 0 && (
                  <p className="col-span-full py-16 text-center text-muted-foreground text-sm">
                    找不到符合的作者
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Orgs */}
        {tab === "orgs" && (
          <>
            {loadingPeople ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredOrgs.map((o) => (
                  <OrgCard key={o.id} org={o} />
                ))}
                {filteredOrgs.length === 0 && (
                  <p className="col-span-full py-16 text-center text-muted-foreground text-sm">
                    找不到符合的組織
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border/60 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">© Screenplay Reader — 免費台本創作與閱讀平台</p>
          <div className="flex items-center gap-3">
            <a href="/privacy" className="text-xs text-muted-foreground hover:text-foreground underline">
              隱私權政策
            </a>
            <a href="/terms" className="text-xs text-muted-foreground hover:text-foreground underline">
              服務條款
            </a>
            <a href="/about" className="text-xs text-muted-foreground hover:text-foreground underline">
              關於
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
