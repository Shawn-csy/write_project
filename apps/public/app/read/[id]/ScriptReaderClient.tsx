"use client";

import React, { useEffect, useMemo } from "react";
import type { PublicScript } from "@/lib/types";
import type { RenderBlock, TocEntry, MarkerConfig } from "@write/script-engine";
import {
  useReaderState,
  createLocalStorageReaderStorage,
  resolveReaderFontFamily,
  useReaderThemeClass,
} from "@write/script-reader-ui";
import { PublicReaderShell } from "@write/public-ui";
import { ScriptContentRenderer } from "./ScriptContentRenderer";
import { ReaderToolbar } from "./ReaderToolbar";
import { usePublicReaderActions } from "./usePublicReaderActions";
import { useSeriesChapterNav } from "./useSeriesChapterNav";
import { useSeriesProgress } from "./useSeriesProgress";
import { SeriesChapterNavigation } from "./SeriesChapterNavigation";
import { ReadWorkHeader } from "./ReadWorkHeader";
import { buildReadWorkHeaderModel } from "@/lib/readWorkHeaderModel";
import { usePublicExport } from "./usePublicExport";
import { usePublicReaderShare } from "./usePublicReaderShare";

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
  );

  const storage = useMemo(
    () => createLocalStorageReaderStorage(`public-reader:${scriptId}`),
    [scriptId]
  );

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

  const seriesNav = useSeriesChapterNav(initialScript);
  const { hasNewChapter, markSeen } = useSeriesProgress(scriptId, seriesNav);

  // Mark this series as seen (record last-read + seen latest) on mount
  useEffect(() => {
    if (seriesNav) markSeen();
  }, [seriesNav, markSeen]);

  const headerStats = useMemo(() => ({
    views: actions.views,
    likes: actions.likes,
    liked: actions.liked,
  }), [actions.views, actions.likes, actions.liked]);

  const headerModel = useMemo(
    () => buildReadWorkHeaderModel(initialScript, headerStats),
    [initialScript, headerStats],
  );

  const { handleExportPdf, pdfReady } = usePublicExport(headerModel);
  const { handleShare, copied } = usePublicReaderShare();

  return (
    <PublicReaderShell
      coverUrl={initialScript.coverUrl}
      toolbar={
        <ReaderToolbar
          readerState={readerState}
          onShare={handleShare}
          copied={copied}
          onExportPdf={handleExportPdf}
          pdfReady={pdfReady}
        />
      }
      header={
        <>
          {seriesNav && (
            <SeriesChapterNavigation
              nav={seriesNav}
              hasNewChapter={hasNewChapter}
              variant="header"
            />
          )}
          <ReadWorkHeader
            model={headerModel}
            actions={{
              onLike: actions.handleLike,
            }}
          />
        </>
      }
      footer={
        <footer className="mt-12 pt-6 border-t border-border/40">
          {seriesNav && (
            <SeriesChapterNavigation
              nav={seriesNav}
              hasNewChapter={hasNewChapter}
              variant="footer"
            />
          )}
          {!seriesNav && initialScript.series?.name && (
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
            className="text-sm text-muted-foreground hover:text-foreground underline mt-4 inline-block"
          >
            ← 返回台本列表
          </a>
        </footer>
      }
    >
      <section id="script-body">
        <ScriptContentRenderer
          blocks={renderBlocks}
          markerConfigs={markerConfigs}
          hiddenMarkerIds={readerState.markerVisibility.hiddenMarkerIds}
          fontSize={fontSize}
          lineHeight={lineHeight}
          readingFontFamily={readingFontFamily}
          className="border-t border-border/40 pt-6"
        />
      </section>
    </PublicReaderShell>
  );
}
