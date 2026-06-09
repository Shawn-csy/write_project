"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicScript, PublicPersona, PublicOrg } from "@/lib/types";

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

// ─── sub-components ────────────────────────────────────────────────────────

function ScriptCard({ script }: { script: PublicScript }) {
  const tags = scriptTags(script);
  return (
    <a
      href={`/read/${script.id}`}
      className="group flex flex-col rounded-xl border border-border/60 bg-background overflow-hidden hover:border-primary/50 hover:shadow-sm transition-all"
    >
      <div className="aspect-[2/3] bg-muted relative overflow-hidden">
        {script.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={script.coverUrl}
            alt={script.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            <span className="text-xs text-muted-foreground text-center line-clamp-4 leading-relaxed">
              {script.title}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {script.title}
        </p>
        {(script.persona?.displayName || script.owner?.displayName) && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {script.persona?.displayName ?? script.owner?.displayName}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

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

export function GalleryClient({ initialScripts }: Props) {
  const [tab, setTab] = useState<Tab>("scripts");
  const [searchTerm, setSearchTerm] = useState("");
  const [scripts, setScripts] = useState<PublicScript[]>(initialScripts);
  const [authors, setAuthors] = useState<PublicPersona[]>([]);
  const [orgs, setOrgs] = useState<PublicOrg[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);

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
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
          >
            {filteredScripts.map((s) => (
              <ScriptCard key={s.id} script={s} />
            ))}
            {filteredScripts.length === 0 && (
              <p className="col-span-full py-16 text-center text-muted-foreground text-sm">
                找不到符合的台本
              </p>
            )}
          </div>
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
