"use client";

import { useEffect, useState } from "react";
import type { PublicScript } from "@/lib/types";

interface Props {
  scriptId: string;
  initialScript: PublicScript;
}

function getAuthorName(script: PublicScript): string {
  if (script.persona?.displayName) return script.persona.displayName;
  if (script.owner?.displayName) return script.owner.displayName;
  return "";
}

function getTagNames(script: PublicScript): string[] {
  return (script.tags ?? []).map((t) => t.name).filter(Boolean);
}

/**
 * ScriptReaderClient — client-side interactive reader.
 * Phase 1b: minimal readable view. Full reader UI (TOC, markers, download, etc.)
 * will be ported incrementally from the Vite app.
 */
export function ScriptReaderClient({ scriptId, initialScript }: Props) {
  const [views, setViews] = useState<number>(initialScript.views ?? 0);
  const authorName = getAuthorName(initialScript);
  const tags = getTagNames(initialScript);

  // Increment view count (fire-and-forget)
  useEffect(() => {
    fetch(`/api/scripts/${scriptId}/view`, { method: "POST" })
      .then((res) => {
        if (res.ok) setViews((current) => current + 1);
      })
      .catch(() => {});
  }, [scriptId]);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          {initialScript.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={initialScript.coverUrl}
              alt={initialScript.title}
              className="w-full max-h-64 object-cover rounded-lg mb-6"
            />
          )}
          <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
            {initialScript.title}
          </h1>
          {authorName && (
            <p className="text-sm text-muted-foreground mb-1">
              作者：{authorName}
            </p>
          )}
          {initialScript.organization?.name && (
            <p className="text-sm text-muted-foreground mb-1">
              組織：{initialScript.organization.name}
            </p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {initialScript.synopsis && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {initialScript.synopsis}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span>{views} 次閱讀</span>
            <span>{initialScript.likes ?? 0} 喜歡</span>
          </div>
        </header>

        {/* Script content */}
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground bg-transparent border-0 p-0">
            {initialScript.content ?? "（無內容）"}
          </pre>
        </article>

        {/* Back link */}
        <div className="mt-10 pt-6 border-t border-border">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← 返回台本列表
          </a>
        </div>
      </div>
    </main>
  );
}
