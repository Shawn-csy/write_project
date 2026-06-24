"use client";

import React, { useEffect, useMemo } from "react";
import type { PublicScript } from "@/lib/types";
import type { AstNode, TocEntry, MarkerConfig } from "@write/script-engine";
import {
  useReaderState,
  createLocalStorageReaderStorage,
  resolveReaderFontFamily,
  type ReaderTheme,
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
import { createAppearanceReaderStorage } from "@/lib/createAppearanceReaderStorage";
import { usePublicAppearance } from "@/components/PublicAppearanceContext";

interface Props {
  scriptId: string;
  initialScript: PublicScript;
  scriptAst: AstNode;
  markerConfigs: MarkerConfig[];
  toc: TocEntry[];
}

export function ScriptReaderClient({
  scriptId,
  initialScript,
  scriptAst,
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

  const appearanceStorage = useMemo(
    () => createAppearanceReaderStorage(globalStorage),
    [globalStorage]
  );

  const readerState = useReaderState({
    markerConfigs,
    toc,
    storage,
    preferencesStorage: appearanceStorage,
  });

  // Typography + theme from PublicAppearanceContext — reactive when appearance menu changes.
  // ThemeProvider is the sole document.documentElement theme writer; reader does not touch it.
  const { prefs: appearancePrefs, setTheme: setAppearanceTheme } = usePublicAppearance();
  const fontSize = appearancePrefs.readerFontSize;
  const lineHeight = appearancePrefs.readerLineHeight;
  const readingFontFamily = resolveReaderFontFamily(appearancePrefs.readerFontFamily);

  // Patch readerState.preferences so the ReaderPreferencesPanel theme buttons
  // wire to PublicAppearanceContext (which drives ThemeProvider) instead of
  // local useReaderState state that has no path to document.documentElement.
  const patchedPreferences = useMemo(() => ({
    ...readerState.preferences,
    preferences: {
      ...readerState.preferences.preferences,
      theme: appearancePrefs.theme as ReaderTheme,
    },
    setTheme: (t: ReaderTheme) => setAppearanceTheme(t as typeof appearancePrefs.theme),
  }), [readerState.preferences, appearancePrefs.theme, setAppearanceTheme]);

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

  const { handleExportPdf, pdfReady } = usePublicExport(initialScript);
  const { handleShare, copied } = usePublicReaderShare();

  return (
    <PublicReaderShell
      coverUrl={initialScript.coverUrl}
      contentWidth="presentation"
      toolbar={
        <ReaderToolbar
          readerState={{ ...readerState, preferences: patchedPreferences }}
          title={initialScript.title}
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
          ast={scriptAst}
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
