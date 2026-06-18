"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import type { PublicScript } from "@/lib/types";
import type { RenderBlock, TocEntry, MarkerConfig } from "@write/script-engine";
import {
  useReaderState,
  createLocalStorageReaderStorage,
  resolveReaderFontFamily,
  useReaderThemeClass,
} from "@write/script-reader-ui";
import {
  PublicReaderShell,
  PublicScriptInfoOverlay,
} from "@write/public-ui";
import { ScriptContentRenderer } from "./ScriptContentRenderer";
import { ReaderToolbar } from "./ReaderToolbar";
import { usePublicReaderActions } from "./usePublicReaderActions";
import { buildScriptOverlayProps } from "../../../lib/scriptProjection";
import { useSeriesChapterNav } from "./useSeriesChapterNav";
import { SeriesChapterNavBar } from "./SeriesChapterNavBar";
import { useSeriesProgress } from "./useSeriesProgress";

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

  // Derive author/org for overlay
  const author = initialScript.persona
    ? { id: initialScript.persona.id, displayName: initialScript.persona.displayName }
    : initialScript.owner
    ? { id: initialScript.owner.id, displayName: initialScript.owner.displayName }
    : null;

  const organization = initialScript.organization
    ? {
        id: initialScript.organization.id,
        name: initialScript.organization.name,
        logoUrl: initialScript.organization.logoUrl,
      }
    : null;

  const tags = (initialScript.tags ?? []).map((t) => t.name).filter(Boolean);

  // Estimate duration from content
  const contentLength = initialScript.contentLength ?? (initialScript.content?.length ?? 0);
  const durationMinutes = contentLength > 0 ? Math.round(contentLength / 2 / 200) : undefined;
  const dialogueChars = contentLength > 0 ? Math.round(contentLength / 2) : undefined;

  const overlayProps = buildScriptOverlayProps(initialScript);

  const infoOverlay = (
    <PublicScriptInfoOverlay
      title={initialScript.title}
      synopsis={initialScript.synopsis ?? undefined}
      coverUrl={initialScript.coverUrl ?? undefined}
      coverCrop={initialScript.coverCrop ?? null}
      coverDesign={initialScript.coverDesign ?? null}
      author={author}
      organization={organization}
      tags={tags}
      tagHref={(tag) => `/tag/${encodeURIComponent(tag)}`}
      views={actions.views}
      likes={actions.likes}
      isLiked={actions.liked}
      onLike={actions.handleLike}
      durationMinutes={durationMinutes}
      dialogueChars={dialogueChars}
      prefaceItems={overlayProps.prefaceItems}
      demoLinks={overlayProps.demoLinks}
      commercialUse={overlayProps.commercialUse}
      derivativeUse={overlayProps.derivativeUse}
      notifyOnModify={overlayProps.notifyOnModify}
      licenseSpecialTerms={overlayProps.licenseSpecialTerms}
      targetAudience={overlayProps.targetAudience}
      contentRating={overlayProps.contentRating}
      customFields={overlayProps.customFields}
      license={overlayProps.license}
    />
  );

  return (
    <PublicReaderShell
      coverUrl={initialScript.coverUrl}
      toolbar={<ReaderToolbar readerState={readerState} />}
      header={infoOverlay}
      footer={
        <footer className="mt-12 pt-6 border-t border-border/40">
          {actions.canDownload && (
            <div className="mb-4">
              <button
                type="button"
                onClick={actions.handleDownloadTxt}
                className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
              >
                下載 .txt
              </button>
            </div>
          )}
          {seriesNav && <SeriesChapterNavBar nav={seriesNav} hasNewChapter={hasNewChapter} />}
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
      <ScriptContentRenderer
        blocks={renderBlocks}
        markerConfigs={markerConfigs}
        hiddenMarkerIds={readerState.markerVisibility.hiddenMarkerIds}
        fontSize={fontSize}
        lineHeight={lineHeight}
        readingFontFamily={readingFontFamily}
        className="border-t border-border/40 pt-6"
      />
    </PublicReaderShell>
  );
}
