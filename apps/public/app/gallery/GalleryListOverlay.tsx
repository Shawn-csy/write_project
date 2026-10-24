"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";
import { getGalleryPublishedTimestamp, type EnrichedGalleryScript } from "@write/public-ui";
import type { ExternalPublicScript } from "@/lib/types";
import { externalEntityHref } from "@/lib/externalEntity";

interface GalleryListOverlayProps {
  scripts: EnrichedGalleryScript[];
  externalItems?: ExternalPublicScript[];
  onClose: () => void;
}

type ListRow =
  | { kind: "local"; item: EnrichedGalleryScript }
  | { kind: "external"; item: ExternalPublicScript };

function toTimestamp(v: number | string | null | undefined): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : 0;
}

function formatDate(v: number | string | null | undefined): string {
  const ts = toTimestamp(v);
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function authorName(author: EnrichedGalleryScript["author"]): string {
  if (!author) return "—";
  if (typeof author === "string") return author || "—";
  return author.displayName || "—";
}

export function GalleryListOverlay({ scripts, externalItems = [], onClose }: GalleryListOverlayProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const sorted = useMemo(
    () => [...scripts.map((item): ListRow => ({ kind: "local", item })), ...externalItems.map((item): ListRow => ({ kind: "external", item }))].sort(
      (a, b) => {
        const aDate = a.kind === "local" ? getGalleryPublishedTimestamp(a.item) : (a.item.mountedAt || a.item.createdAt || 0);
        const bDate = b.kind === "local" ? getGalleryPublishedTimestamp(b.item) : (b.item.mountedAt || b.item.createdAt || 0);
        return toTimestamp(bDate) - toTimestamp(aDate);
      }
    ),
    [scripts, externalItems]
  );
  const visibleRows = useMemo(() => {
    const needle = searchTerm.trim().toLocaleLowerCase();
    if (!needle) return sorted;
    return sorted.filter((row) => {
      const title = row.kind === "external"
        ? (row.item.title || row.item.remoteTitle || "")
        : (row.item.title || "");
      const author = row.kind === "external"
        ? (row.item.authorName || "")
        : authorName(row.item.author);
      return `${title} ${author}`.toLocaleLowerCase().includes(needle);
    });
  }, [searchTerm, sorted]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal="true" aria-label="台本一覽表">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-[2px] editorial-scrim"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className="relative z-10 mx-auto mt-[5vh] mb-[5vh] flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl"
        style={{
          background: "hsl(var(--background))",
          boxShadow: "0 24px 64px hsl(var(--foreground) / 0.18), 0 0 0 1px hsl(var(--border) / 0.5)",
          maxHeight: "90vh",
          width: "calc(100% - 2rem)",
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 px-5 py-4 editorial-border-b">
          <div className="min-w-[8rem] flex-1">
            <p className="text-[0.9375rem] font-semibold text-foreground">台本一覽表</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {searchTerm.trim() ? `${visibleRows.length} / ${sorted.length} 部` : `${sorted.length} 部`}・依發表時間排序
            </p>
          </div>
          <div className="relative order-3 w-full sm:order-none sm:w-64 md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/65" aria-hidden />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="快速搜尋台本或作者..."
              aria-label="快速搜尋台本或作者"
              className="h-9 w-full rounded-lg border border-border/60 bg-background/70 pl-9 pr-9 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-muted/60 hover:text-foreground"
                aria-label="清除快速搜尋"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="關閉一覽表"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full table-fixed text-sm border-collapse">
            <thead>
              <tr className="editorial-border-b">
                <th className="sticky top-0 bg-background/95 backdrop-blur-sm w-10 py-2.5 pl-5 pr-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">#</th>
                <th className="sticky top-0 bg-background/95 backdrop-blur-sm py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 w-[37%] md:w-[34%]">台本名稱</th>
                <th className="sticky top-0 bg-background/95 backdrop-blur-sm py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 hidden sm:table-cell w-[20%]">作者</th>
                <th className="sticky top-0 bg-background/95 backdrop-blur-sm py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 hidden md:table-cell w-[30%]">標籤</th>
                <th className="sticky top-0 bg-background/95 backdrop-blur-sm py-2.5 px-3 pr-5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 whitespace-nowrap">日期</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, idx) => {
                const external = row.kind === "external" ? row.item : null;
                const local = row.kind === "local" ? row.item : null;
                const isExternal = Boolean(external);
                const ts = external ? (external.mountedAt || external.createdAt || 0) : (local ? getGalleryPublishedTimestamp(local) : 0);
                const title = external ? (external.title || external.remoteTitle || "（無標題）") : (local?.title || "（無標題）");
                const author = external ? (external.authorName || "—") : authorName(local?.author ?? null);
                const authorHref = external
                  ? (external.authorName ? externalEntityHref("author", external.authorName, external.authorUrl) : undefined)
                  : (local && typeof local.author === "object" && local.author?.id ? `/author/${local.author.id}` : undefined);
                const licenseSet = new Set(local?._derivedLicenseTags ?? []);
                const contentTags: string[] = external
                  ? (external.categories || []).slice(0, 4)
                  : (local?.tags as string[] | undefined ?? [])
                    .filter((t): t is string => typeof t === "string" && !licenseSet.has(t))
                    .slice(0, 4);
                return (
                  <tr
                    key={external?.id || local?.id}
                    className="group transition-colors"
                    style={{ borderBottom: "1px solid hsl(var(--border) / 0.2)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "hsl(var(--muted) / 0.5)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
                  >
                    <td className="py-2.5 pl-5 pr-2 text-[11px] text-muted-foreground/50 tabular-nums align-top pt-3">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 align-top pt-3 min-w-0">
                      <a
                        href={external ? external.sourceUrl : `/read/${local?.id || ""}`}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "nofollow noopener noreferrer" : undefined}
                        className="font-medium text-foreground hover:text-primary transition-colors no-underline line-clamp-1 block"
                      >
                        <span className="inline-flex max-w-full items-center gap-1">
                          <span className="line-clamp-2 break-words">{title}</span>
                          {isExternal && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="外部連結" />}
                        </span>
                      </a>
                      {!isExternal && local?.seriesName && (
                        <span className="text-[11px] text-muted-foreground/60 line-clamp-1">
                          {local.seriesName}
                        </span>
                      )}
                      {external?.seriesName && (
                        <a href={`/series/${encodeURIComponent(external.seriesName)}`} className="text-[11px] text-muted-foreground/60 line-clamp-1 hover:text-primary hover:underline">
                          {external.seriesName}
                        </a>
                      )}
                      {external && <span className="text-[11px] text-muted-foreground/60 line-clamp-1">外部連結{external.sourceDomain ? ` · ${external.sourceDomain}` : ""}</span>}
                      {/* Tags shown inline on mobile (md: hidden via tag column) */}
                      {contentTags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1 md:hidden">
                          {contentTags.map((tag) => (
                            <span key={tag} className="inline-flex items-center h-5 px-1.5 rounded-[4px] border border-border/40 bg-muted/40 text-[10px] text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap align-top pt-3">
                      {authorHref ? (
                        <a href={authorHref} className="text-muted-foreground hover:text-primary hover:underline transition-colors">
                          {author}
                        </a>
                      ) : author}
                    </td>
                    <td className="py-2.5 px-3 hidden md:table-cell align-top pt-3">
                      <div className="flex flex-wrap gap-1">
                        {contentTags.map((tag) => (
                          <span key={tag} className="inline-flex items-center h-5 px-1.5 rounded-[4px] border border-border/40 bg-muted/40 text-[10px] text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 pr-5 text-right text-[11px] text-muted-foreground/70 tabular-nums whitespace-nowrap align-top pt-3">
                      {formatDate(ts)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibleRows.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {searchTerm.trim() ? "找不到符合的台本或作者" : "目前沒有符合條件的台本"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
