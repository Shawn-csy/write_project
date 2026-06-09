"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicScript } from "@/lib/types";
import type { AstNode, TocEntry, MarkerConfig } from "@write/script-engine";
import { extractToc } from "@write/script-engine";
import { ScriptContentRenderer } from "./ScriptContentRenderer";

// Persistent visitor ID for anonymous like tracking (mirrors Vite getVisitorId() — same key)
function getOrCreateVisitorId(): string {
  try {
    const key = "visitor_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = `v-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

interface Props {
  scriptId: string;
  initialScript: PublicScript;
  parsedRoot: AstNode;
  markerConfigs: MarkerConfig[];
}

function getAuthorName(script: PublicScript): string {
  if (script.persona?.displayName) return script.persona.displayName;
  if (script.owner?.displayName) return script.owner.displayName;
  return "";
}

function getTagNames(script: PublicScript): string[] {
  return (script.tags ?? []).map((t) => t.name).filter(Boolean);
}

export function ScriptReaderClient({
  scriptId,
  initialScript,
  parsedRoot,
  markerConfigs,
}: Props) {
  const [views, setViews] = useState<number>(initialScript.views ?? 0);
  const [likes, setLikes] = useState<number>(initialScript.likes ?? 0);
  const [liked, setLiked] = useState(false);
  const [likeInFlight, setLikeInFlight] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const likeRef = useRef(liked);
  likeRef.current = liked;

  const authorName = getAuthorName(initialScript);
  const tags = getTagNames(initialScript);
  const toc: TocEntry[] = extractToc(parsedRoot);

  // Increment view count
  useEffect(() => {
    fetch(`/api/scripts/${scriptId}/view`, { method: "POST" }).catch(() => {});
  }, [scriptId]);

  // Fetch like status via public visitor-based endpoint
  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    fetch(`/api/public-scripts/${scriptId}/like-status?visitorId=${encodeURIComponent(visitorId)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setLiked(Boolean(data.liked));
          setLikes(Number(data.likes ?? 0));
        }
      })
      .catch(() => {});
  }, [scriptId]);

  const handleLike = async () => {
    if (likeInFlight) return;
    setLikeInFlight(true);
    const prev = likeRef.current;
    setLiked(!prev);
    setLikes((l) => (prev ? Math.max(0, l - 1) : l + 1));
    try {
      const visitorId = getOrCreateVisitorId();
      const res = await fetch(`/api/public-scripts/${scriptId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(Boolean(data.liked));
        setLikes(Number(data.likes));
      }
    } catch {
      setLiked(prev);
      setLikes((l) => (prev ? l + 1 : Math.max(0, l - 1)));
    } finally {
      setLikeInFlight(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch { /* fallback */ }
    window.prompt("複製連結：", url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="flex h-12 items-center gap-2 px-4 max-w-4xl mx-auto">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            ← 台本列表
          </a>
          {toc.length > 0 && (
            <button
              type="button"
              onClick={() => setTocOpen((v) => !v)}
              className="ml-auto text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              目錄 ({toc.length})
            </button>
          )}
        </div>

        {/* TOC dropdown */}
        {tocOpen && toc.length > 0 && (
          <div className="border-t border-border/60 bg-background max-h-48 overflow-y-auto">
            <nav className="max-w-4xl mx-auto px-4 py-2">
              {toc.map((entry) => (
                <a
                  key={entry.id}
                  href={`#${entry.id}`}
                  onClick={() => setTocOpen(false)}
                  className="block text-sm py-1 text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {entry.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        {/* Script header */}
        <header className="mb-8">
          {initialScript.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={initialScript.coverUrl}
              alt={initialScript.title}
              className="w-full max-h-72 object-cover rounded-xl mb-6 shadow"
            />
          )}

          <h1 className="text-2xl font-bold leading-tight mb-3">
            {initialScript.title}
          </h1>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
            {authorName && (
              <span>
                作者：
                {initialScript.persona?.id ? (
                  <a
                    href={`/author/${initialScript.persona.id}`}
                    className="hover:text-foreground underline"
                  >
                    {authorName}
                  </a>
                ) : (
                  authorName
                )}
              </span>
            )}
            {initialScript.organization?.name && (
              <span>
                組織：
                {initialScript.organization.id ? (
                  <a
                    href={`/org/${initialScript.organization.id}`}
                    className="hover:text-foreground underline"
                  >
                    {initialScript.organization.name}
                  </a>
                ) : (
                  initialScript.organization.name
                )}
              </span>
            )}
            {initialScript.series?.name && (
              <span>
                系列：
                <a
                  href={`/series/${encodeURIComponent(initialScript.series.name)}`}
                  className="hover:text-foreground underline"
                >
                  {initialScript.series.name}
                </a>
              </span>
            )}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {initialScript.synopsis && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3 max-w-2xl">
              {initialScript.synopsis}
            </p>
          )}

          {/* Stats + actions row */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs text-muted-foreground">{views} 次閱讀</span>

            <button
              type="button"
              onClick={handleLike}
              disabled={likeInFlight}
              className={`flex items-center gap-1 text-xs rounded px-2 py-1 border transition-colors ${
                liked
                  ? "border-red-400/60 bg-red-50 text-red-500 dark:bg-red-950/30"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {liked ? "♥" : "♡"} {likes}
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? "已複製！" : "分享連結"}
            </button>
          </div>
        </header>

        {/* Script content — SSR-parsed, rendered with marker styles */}
        <ScriptContentRenderer
          root={parsedRoot}
          markerConfigs={markerConfigs}
          className="border-t border-border/40 pt-6"
        />

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border/40">
          {initialScript.series?.name && (
            <div className="mb-4">
              <a
                href={`/series/${encodeURIComponent(initialScript.series.name)}`}
                className="text-sm text-primary hover:underline"
              >
                ← 查看系列：{initialScript.series.name}
              </a>
            </div>
          )}
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← 返回台本列表
          </a>
        </footer>
      </div>
    </div>
  );
}
