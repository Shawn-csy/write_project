"use client";

import React, { useMemo } from "react";
import type { PublicScript } from "@/lib/types";
import type { RenderBlock, TocEntry, MarkerConfig } from "@write/script-engine";
import {
  useReaderState,
  createLocalStorageReaderStorage,
  resolveReaderFontFamily,
  useReaderThemeClass,
} from "@write/script-reader-ui";
import { ScriptContentRenderer } from "./ScriptContentRenderer";
import { PublicReaderHeader } from "./PublicReaderHeader";
import { ReaderToolbar } from "./ReaderToolbar";
import { usePublicReaderActions } from "./usePublicReaderActions";

interface Props {
  scriptId: string;
  initialScript: PublicScript;
  renderBlocks: RenderBlock[];
  markerConfigs: MarkerConfig[];
  toc: TocEntry[];
}

export function ScriptReaderClient({
  scriptId,
  initialScript,
  renderBlocks,
  markerConfigs,
  toc,
}: Props) {
  const actions = usePublicReaderActions(
    scriptId,
    initialScript.views ?? 0,
    initialScript.likes ?? 0,
    initialScript.title,
    initialScript.content ?? "",
  );

  const storage = useMemo(
    () => createLocalStorageReaderStorage(`public-reader:${scriptId}`),
    [scriptId]
  );

  // Global adapter — not scoped to scriptId so preferences persist across scripts.
  const globalStorage = useMemo(
    () => createLocalStorageReaderStorage("public-reader"),
    []
  );

  const readerState = useReaderState({
    markerConfigs,
    toc,
    storage,
    preferencesStorage: globalStorage,
  });

  const { theme, fontSize, lineHeight, fontFamily } = readerState.preferences.preferences;
  useReaderThemeClass(theme);
  const readingFontFamily = resolveReaderFontFamily(fontFamily);

  return (
    <div className="min-h-screen bg-background">
      <ReaderToolbar readerState={readerState} />

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        <PublicReaderHeader script={initialScript} actions={actions} />

        <ScriptContentRenderer
          blocks={renderBlocks}
          markerConfigs={markerConfigs}
          hiddenMarkerIds={readerState.markerVisibility.hiddenMarkerIds}
          fontSize={fontSize}
          lineHeight={lineHeight}
          readingFontFamily={readingFontFamily}
          className="border-t border-border/40 pt-6"
        />

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
