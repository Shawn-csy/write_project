import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScriptRenderer } from './ScriptRenderer';
import { ScriptRendererV2 } from './v2/ScriptRendererV2';
import { RenderBlockRenderer } from './RenderBlockRenderer';
import { normalizeMarkerConfigsSchema } from '@write/script-engine';
import { buildViewerRenderBlocks, buildRawRenderBlocks, type ViewerOptions } from '../../lib/viewerRenderPipeline';
import { useI18n } from '../../contexts/I18nContext';
import { resolveReadingFontStack } from '../../constants/readingFonts';
import { cloneDefaultLayoutConfig, type LayoutConfig } from '../../lib/v2';
import { getMarkerElement, readMarkerAttrs } from '../../lib/markerDom';
import { useScriptDocument, type ScriptDocAstNode, type ScriptDocSceneItem, type ScriptDocTitleEntry } from '../../hooks/useScriptDocument';
import { useRenderedSnapshot } from '../../hooks/useRenderedSnapshot';
import type { ReaderDisplayPreferences } from '@write/script-reader-renderer';

interface ScriptViewerProps {
  text: string;
  externalAst?: { children?: ScriptDocAstNode[] } | null;
  externalScenes?: ScriptDocSceneItem[] | null;
  externalTitleEntries?: ScriptDocTitleEntry[] | null;
  filterCharacter?: string | null;
  /** Handled by the legacy ScriptRenderer path only. The render model path (useRenderModelRenderer) ignores this. */
  focusMode?: boolean;
  /** Handled by the legacy ScriptRenderer path only. The render model path (useRenderModelRenderer) ignores this. */
  focusEffect?: string;
  onCharacters?: (chars: string[]) => void;
  onTitle?: (html: string) => void;
  onTitleName?: (name: string) => void;
  onTitleNote?: (note: string) => void;
  onSummary?: (summary: string) => void;
  onHasTitle?: (has: boolean) => void;
  onRawHtml?: (html: string) => void;
  onProcessedHtml?: (html: string) => void;
  onScenes?: (scenes: ScriptDocSceneItem[]) => void;
  scrollToScene?: string | null;
  theme?: string;
  accentColor?: string;
  type?: string;
  markerConfigs?: Array<{ id?: string; [key: string]: unknown }>;
  hiddenMarkerIds?: string[];
  focusContentMode?: string;
  usePresentationRenderer?: boolean;
  presentationLayoutConfig?: LayoutConfig;
  useRenderModelRenderer?: boolean;
  /**
   * Structured display preferences (Phase 3 — preferred path).
   * When provided, typography/guides/markers groups are sourced from here.
   * Individual flat props (bodyFontSize, showLineUnderline, etc.) override
   * the corresponding displayPreferences field when explicitly set, allowing
   * gradual migration and backward compatibility with ScriptSurface spread.
   */
  displayPreferences?: ReaderDisplayPreferences;
  // Flat props — kept for backward compat with ScriptSurface viewerProps spread.
  // Prefer displayPreferences for new call sites.
  fontSize?: number;
  bodyFontSize?: number;
  dialogueFontSize?: number;
  readingFontFamily?: string;
  lineHeight?: number;
  showMarkers?: boolean;
  showLineUnderline?: boolean;
}

const TOOLTIP_OFFSET = 14;
const TOOLTIP_MAX_WIDTH = 280;
const TOOLTIP_EDGE_PADDING = 8;
const TOOLTIP_TOP_FALLBACK_THRESHOLD = 96;

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

function ScriptViewer({
  text,
  // When provided by a parent that already parsed the same text, the internal
  // parseScreenplay call is skipped (avoids redundant O(n) work).
  externalAst = null,
  externalScenes = null,
  externalTitleEntries = null,
  filterCharacter,
  focusMode,
  focusEffect = 'hide',
  onCharacters,
  onTitle,
  onTitleName,
  onTitleNote,
  onSummary,
  onHasTitle,
  onRawHtml,
  onProcessedHtml,
  onScenes,
  scrollToScene,
  theme,
  accentColor,
  type = 'script',
  markerConfigs = [],
  hiddenMarkerIds = [],
  focusContentMode = "all",
  usePresentationRenderer = false,
  presentationLayoutConfig,
  useRenderModelRenderer = false,
  displayPreferences,
  // Flat props — override displayPreferences when explicitly provided.
  fontSize,
  bodyFontSize,
  dialogueFontSize,
  readingFontFamily,
  lineHeight,
  showMarkers,
  showLineUnderline,
}: ScriptViewerProps) {
  // Resolve display values: explicit flat prop wins → displayPreferences group → hardcoded default.
  // `fontSize` is a legacy scalar kept for backward compat with old call sites; it is NOT
  // a flat-prop override of displayPreferences. It falls after displayPreferences in the chain
  // so that passing displayPreferences + fontSize does not let fontSize silently win.
  // New call sites should use displayPreferences.typography.bodyFontSize or the bodyFontSize flat prop.
  const _bodyFontSize      = bodyFontSize      ?? displayPreferences?.typography.bodyFontSize      ?? fontSize ?? 14;
  const _dialogueFontSize  = dialogueFontSize  ?? displayPreferences?.typography.dialogueFontSize  ?? _bodyFontSize;
  const _readingFontFamily = readingFontFamily ?? displayPreferences?.typography.readingFontFamily ?? "serif";
  const _lineHeight        = lineHeight        ?? displayPreferences?.typography.lineHeight        ?? 1.4;
  const _showMarkers       = showMarkers       ?? displayPreferences?.markers.showMarkers          ?? true;
  const _showLineUnderline = showLineUnderline ?? displayPreferences?.guides.showLineUnderline     ?? false;
  const { t } = useI18n();
  const readingFontStack = resolveReadingFontStack(_readingFontFamily);
  const colorCache = useRef<Map<string, string>>(new Map());
  const [markerTooltip, setMarkerTooltip] = useState<TooltipState | null>(null);

  // Mode check
  const isScript = type === 'script';

  const { ast, sceneList, titlePage, titleSummary, bodySummary, characterList } = useScriptDocument({
    text,
    markerConfigs,
    externalAst,
    externalScenes,
    externalTitleEntries,
    t,
  });
  const effectiveHiddenMarkerIds = useMemo(() => {
    return (hiddenMarkerIds || []).map((id) => String(id || "").trim()).filter(Boolean);
  }, [hiddenMarkerIds]);

  const normalizedMarkerConfigs = useMemo(
    () => normalizeMarkerConfigsSchema(Array.isArray(markerConfigs) ? markerConfigs : []),
    [markerConfigs]
  );

  const renderBlocks = useMemo(() => {
    if (!useRenderModelRenderer || !ast) return null;
    const opts: ViewerOptions = {};
    if (filterCharacter) opts.filterCharacter = filterCharacter;
    // Pass raw markerConfigs — pipeline normalizes internally.
    return buildViewerRenderBlocks(ast as any, markerConfigs, opts);
  }, [useRenderModelRenderer, ast, markerConfigs, filterCharacter]);

  useEffect(() => {
    onCharacters?.(characterList);
  }, [characterList, onCharacters]);

  // Return title page HTML to parent
  useEffect(() => {
    const html = titlePage.has ? titlePage.html : '';
    const hasTitle = titlePage.has;
    onHasTitle?.(hasTitle);
    onTitle?.(html);
    if (hasTitle) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const h1 = doc.querySelector('h1');
      const h2 = doc.querySelector('h2');
      const titleText = titlePage.title?.trim() || h1?.textContent?.trim() || h2?.textContent?.trim() || '';
      onTitleName?.(titleText);
      onTitleNote?.(titlePage.note || '');
    } else {
      onTitleName?.('');
      onTitleNote?.('');
    }
  }, [titlePage, onTitle, onTitleName, onHasTitle, onTitleNote]);

  useEffect(() => {
    const summaryText = titleSummary || bodySummary || "";
    onSummary?.(summaryText);
  }, [titleSummary, bodySummary, onSummary]);

  useEffect(() => {
    if (!onScenes) return;
    onScenes(sceneList);
  }, [sceneList, onScenes]);

  const effectiveBodyFontSize = _bodyFontSize;
  const effectiveDialogueFontSize = _dialogueFontSize;

  const renderScriptNode = useCallback((
    currentAst: { children?: ScriptDocAstNode[] } | null,
    // filterCharacterValue: render model path uses this to detect snapshot override (null → raw blocks).
    // focusModeValue: only used by the legacy ScriptRenderer path below; render model ignores it.
    options?: { filterCharacterValue?: string | null; focusModeValue?: boolean }
  ) => {
    if (!currentAst) return null;
    if (useRenderModelRenderer && renderBlocks) {
      // Snapshot override: useRenderedSnapshot passes filterCharacterValue=null to get raw HTML.
      const optionsOverrideFilter = options?.filterCharacterValue !== undefined;
      const effectiveBlocks = optionsOverrideFilter
        ? buildRawRenderBlocks(currentAst as Parameters<typeof buildRawRenderBlocks>[0], markerConfigs)
        : renderBlocks;
      return (
        <RenderBlockRenderer
          blocks={effectiveBlocks}
          fontSize={effectiveBodyFontSize}
          lineHeight={_lineHeight}
          readingFontFamily={readingFontStack}
          markerConfigs={normalizedMarkerConfigs}
          hiddenMarkerIds={effectiveHiddenMarkerIds}
          showMarkerTooltip={_showMarkers}
          markerTooltipPrefix={t("scriptRenderer.markerTooltipPrefix", "標記")}
          showLineUnderline={_showLineUnderline}
          colorCache={colorCache}
        />
      );
    }
    if (usePresentationRenderer) {
      return (
        <ScriptRendererV2
          ast={currentAst}
          layoutConfig={presentationLayoutConfig || cloneDefaultLayoutConfig()}
          markerConfigs={markerConfigs as any}
          fontSize={effectiveBodyFontSize}
          lineHeight={_lineHeight}
          readingFontFamily={_readingFontFamily}
          hiddenMarkerIds={effectiveHiddenMarkerIds}
          markerTooltipPrefix={_showMarkers ? t("scriptRenderer.markerTooltipPrefix", "標記") : null}
          showLineUnderline={_showLineUnderline}
          mode="auto"
        />
      );
    }
    return (
      <ScriptRenderer
        ast={currentAst}
        fontSize={effectiveBodyFontSize}
        dialogueFontSize={effectiveDialogueFontSize}
        lineHeight={_lineHeight}
        readingFontFamily={_readingFontFamily}
        filterCharacter={options?.filterCharacterValue ?? filterCharacter}
        focusMode={options?.focusModeValue ?? focusMode}
        focusEffect={focusEffect}
        focusContentMode={focusContentMode}
        theme={theme}
        colorCache={colorCache}
        markerConfigs={markerConfigs}
        hiddenMarkerIds={effectiveHiddenMarkerIds}
        showMarkerTooltip={_showMarkers}
        showLineUnderline={_showLineUnderline}
      />
    );
  }, [
    useRenderModelRenderer, renderBlocks, markerConfigs, normalizedMarkerConfigs,
    effectiveBodyFontSize, effectiveDialogueFontSize, _lineHeight, readingFontStack,
    _readingFontFamily, effectiveHiddenMarkerIds, _showMarkers, _showLineUnderline, t,
    usePresentationRenderer, presentationLayoutConfig,
    filterCharacter, focusMode, focusEffect, focusContentMode, theme,
  ]);

  const markerLabelById = useMemo(() => {
    const map = new Map<string, string>();
    (Array.isArray(markerConfigs) ? markerConfigs : []).forEach((cfg) => {
      const id = String(cfg?.id || "").trim();
      if (!id) return;
      const label = String(cfg?.label || cfg?.name || cfg?.displayName || id).trim();
      if (!map.has(id)) map.set(id, label);
    });
    return map;
  }, [markerConfigs]);

  const resolveMarkerTooltip = (target: EventTarget | null) => {
    const markerEl = getMarkerElement(target);
    if (!markerEl) return null;
    const { markerId, markerLabel: attrLabel } = readMarkerAttrs(markerEl);
    if (!markerId) return null;
    const markerLabel = attrLabel || markerLabelById.get(markerId) || markerId;
    return { markerId, markerLabel };
  };

  const handleV2PointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!usePresentationRenderer || !_showMarkers) {
      if (markerTooltip) setMarkerTooltip(null);
      return;
    }
    const resolved = resolveMarkerTooltip(event.target);
    if (!resolved) { if (markerTooltip) setMarkerTooltip(null); return; }
    const text = `${t("scriptRenderer.markerTooltipPrefix", "標記")}: ${resolved.markerLabel}`;
    setMarkerTooltip({ text, x: event.clientX, y: event.clientY });
  };

  const handleV2PointerLeave = () => {
    if (!usePresentationRenderer) return;
    if (markerTooltip) setMarkerTooltip(null);
  };

  const markerTooltipStyle = useMemo(() => {
    if (!markerTooltip) return null;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const preferTop = markerTooltip.y > TOOLTIP_TOP_FALLBACK_THRESHOLD;
    const unclampedLeft = markerTooltip.x + TOOLTIP_OFFSET;
    const maxLeft = Math.max(TOOLTIP_EDGE_PADDING, viewportWidth - TOOLTIP_MAX_WIDTH - TOOLTIP_EDGE_PADDING);
    const left = Math.min(Math.max(TOOLTIP_EDGE_PADDING, unclampedLeft), maxLeft);
    const top = preferTop ? markerTooltip.y - TOOLTIP_OFFSET : markerTooltip.y + TOOLTIP_OFFSET;
    return {
      left: `${left}px`,
      top: `${top}px`,
      maxWidth: `${TOOLTIP_MAX_WIDTH}px`,
      transform: preferTop ? "translateY(-100%)" : "none",
    };
  }, [markerTooltip]);

  const { filteredHtml } = useRenderedSnapshot({
    ast,
    onRawHtml,
    onProcessedHtml,
    filterCharacter,
    focusMode,
    renderScriptNode,
  });

  useEffect(() => {
    // Rebuild character-color mapping when source text / theme changes,
    // so newly imported character lists won't inherit stale same-color cache.
    colorCache.current.clear();
  }, [text, accentColor]);

  useEffect(() => {
    if (!scrollToScene) return;
    const el = document.getElementById(scrollToScene);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scrollToScene, filteredHtml]);

  // Non-script rendering (Simple Text)
  if (!isScript) {
      return (
        <article
            className="script-view-root p-8 max-w-3xl mx-auto"
            style={{ fontFamily: readingFontStack }}
        >
            <div className="whitespace-pre-wrap text-foreground/90">
                {text}
            </div>
        </article>
      );
  }

  return (
    <article
      className="script-view-root"
      onPointerMove={handleV2PointerMove}
      onPointerLeave={handleV2PointerLeave}
    >
      {renderScriptNode(ast)}
      {usePresentationRenderer && markerTooltip && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[80] pointer-events-none rounded-md border border-border/60 bg-popover/95 px-2 py-1 text-xs text-popover-foreground shadow-lg backdrop-blur-sm"
              style={markerTooltipStyle || undefined}
            >
              {markerTooltip.text}
            </div>,
            document.body
          )
        : null}
    </article>
  );
}

export default React.memo(ScriptViewer);
