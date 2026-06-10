"use client";

import React from "react";
import type { PublicScript } from "@/lib/types";
import type { PublicReaderActions } from "./usePublicReaderActions";

interface Props {
  script: PublicScript;
  actions: PublicReaderActions;
}

function getAuthorName(script: PublicScript): string {
  if (script.persona?.displayName) return script.persona.displayName;
  if (script.owner?.displayName) return script.owner.displayName;
  return "";
}

export function PublicReaderHeader({ script, actions }: Props) {
  const authorName = getAuthorName(script);
  const tags = (script.tags ?? []).map((t) => t.name).filter(Boolean);

  return (
    <header className="mb-8">
      {script.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={script.coverUrl}
          alt={script.title}
          className="w-full max-h-72 object-cover rounded-xl mb-6 shadow"
        />
      )}

      <h1 className="text-2xl font-bold leading-tight mb-3">{script.title}</h1>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
        {authorName && (
          <span>
            作者：
            {script.persona?.id ? (
              <a href={`/author/${script.persona.id}`} className="hover:text-foreground underline">
                {authorName}
              </a>
            ) : (
              authorName
            )}
          </span>
        )}
        {script.organization?.name && (
          <span>
            組織：
            {script.organization.id ? (
              <a href={`/org/${script.organization.id}`} className="hover:text-foreground underline">
                {script.organization.name}
              </a>
            ) : (
              script.organization.name
            )}
          </span>
        )}
        {script.series?.name && (
          <span>
            系列：
            <a
              href={`/series/${encodeURIComponent(script.series.name)}`}
              className="hover:text-foreground underline"
            >
              {script.series.name}
            </a>
          </span>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((tag) => (
            <a
              key={tag}
              href={`/tag/${encodeURIComponent(tag)}`}
              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              {tag}
            </a>
          ))}
        </div>
      )}

      {script.synopsis && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-3 max-w-2xl">
          {script.synopsis}
        </p>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs text-muted-foreground">{actions.views} 次閱讀</span>
        <button
          type="button"
          onClick={actions.handleLike}
          disabled={actions.likeInFlight}
          className={`flex items-center gap-1 text-xs rounded px-2 py-1 border transition-colors ${
            actions.liked
              ? "border-red-400/60 bg-red-50 text-red-500 dark:bg-red-950/30"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          {actions.liked ? "♥" : "♡"} {actions.likes}
        </button>
        <button
          type="button"
          onClick={actions.handleShare}
          className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
        >
          {actions.copied ? "已複製！" : "分享連結"}
        </button>
        {actions.canDownload && (
          <button
            type="button"
            onClick={actions.handleDownloadTxt}
            className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            下載 .txt
          </button>
        )}
      </div>
    </header>
  );
}
