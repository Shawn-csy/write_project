"use client";

import React, { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import type { EnrichedGalleryScript } from "@write/public-ui";

interface GalleryListOverlayProps {
  scripts: EnrichedGalleryScript[];
  onClose: () => void;
}

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

export function GalleryListOverlay({ scripts, onClose }: GalleryListOverlayProps) {
  const sorted = useMemo(
    () =>
      [...scripts].sort(
        (a, b) =>
          (toTimestamp(b.lastModified) || toTimestamp(b.updatedAt)) -
          (toTimestamp(a.lastModified) || toTimestamp(a.updatedAt))
      ),
    [scripts]
  );

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
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{ background: "hsl(var(--foreground) / 0.3)" }}
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
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}
        >
          <div>
            <p className="text-[0.9375rem] font-semibold text-foreground">台本一覽表</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sorted.length} 部・依發表時間排序
            </p>
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
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid hsl(var(--border) / 0.35)" }}>
                <th className="sticky top-0 bg-background/95 backdrop-blur-sm w-10 py-2.5 pl-5 pr-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">#</th>
                <th className="sticky top-0 bg-background/95 backdrop-blur-sm py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 w-[45%] md:w-[40%]">台本名稱</th>
                <th className="sticky top-0 bg-background/95 backdrop-blur-sm py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 hidden sm:table-cell w-[20%]">作者</th>
                <th className="sticky top-0 bg-background/95 backdrop-blur-sm py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 hidden md:table-cell w-[24%]">標籤</th>
                <th className="sticky top-0 bg-background/95 backdrop-blur-sm py-2.5 px-3 pr-5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 whitespace-nowrap">日期</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, idx) => {
                const ts = toTimestamp(s.lastModified) || toTimestamp(s.updatedAt);
                const licenseSet = new Set(s._derivedLicenseTags ?? []);
                const contentTags = (s.tags as string[] | undefined ?? [])
                  .filter((t) => typeof t === "string" && !licenseSet.has(t))
                  .slice(0, 4);
                return (
                  <tr
                    key={s.id}
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
                        href={`/read/${s.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors no-underline line-clamp-1 block"
                      >
                        {s.title || "（無標題）"}
                      </a>
                      {s.seriesName && (
                        <span className="text-[11px] text-muted-foreground/60 line-clamp-1">
                          {s.seriesName}
                        </span>
                      )}
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
                      {authorName(s.author)}
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
          {sorted.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">目前沒有符合條件的台本</p>
          )}
        </div>
      </div>
    </div>
  );
}
