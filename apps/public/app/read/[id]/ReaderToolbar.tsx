"use client";

import React, { useState } from "react";
import type { TocEntry, MarkerConfig } from "@write/script-engine";
import { MarkerVisibilityMenu } from "@write/script-reader-ui";
import type { ReaderMarkerVisibility } from "@write/script-reader-ui";

interface Props {
  markerConfigs: MarkerConfig[];
  markerVisibility: ReaderMarkerVisibility;
  toc: TocEntry[];
}

export function ReaderToolbar({ markerConfigs, markerVisibility, toc }: Props) {
  const [tocOpen, setTocOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="flex h-12 items-center gap-2 px-4 max-w-4xl mx-auto">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            ← 台本列表
          </a>
          <div className="ml-auto flex items-center gap-2">
            <MarkerVisibilityMenu
              markerConfigs={markerConfigs}
              visibility={markerVisibility}
            />
            {toc.length > 0 && (
              <button
                type="button"
                onClick={() => setTocOpen((v) => !v)}
                className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                目錄 ({toc.length})
              </button>
            )}
          </div>
        </div>

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
    </>
  );
}
