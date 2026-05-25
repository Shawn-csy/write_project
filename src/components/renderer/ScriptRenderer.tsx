import React, { useMemo, useRef, useState } from 'react';
import { parseInline } from '../../lib/parsers/inlineParser';
import { isInlineLike } from '../../lib/markerRules';
import { useI18n } from '../../contexts/I18nContext';
import { resolveReadingFontStack } from '../../constants/readingFonts';
import type { MarkerConfig } from '../../types/script';
import type { MarkerConfigLike } from '../../types/renderer';
import { NodeRenderer } from './NodeRenderer';
import type { RendererNode } from './NodeRenderer';
import { getMarkerElement, readMarkerAttrs } from '../../lib/markerDom';

const TOOLTIP_OFFSET = 14;
const TOOLTIP_MAX_WIDTH = 280;
const TOOLTIP_EDGE_PADDING = 8;
const TOOLTIP_TOP_FALLBACK_THRESHOLD = 96;

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

interface ScriptRendererProps {
  ast: RendererNode | { children?: RendererNode[] } | null;
  fontSize?: number;
  dialogueFontSize?: number;
  lineHeight?: number;
  readingFontFamily?: string;
  filterCharacter?: string | null;
  focusMode?: boolean;
  focusEffect?: string;
  focusContentMode?: string;
  themePalette?: unknown;
  colorCache?: React.MutableRefObject<Map<string, string>>;
  theme?: string;
  markerConfigs?: MarkerConfigLike[];
  hiddenMarkerIds?: string[];
  showLineUnderline?: boolean;
}

export const ScriptRenderer = React.memo(({
  ast,
  fontSize = 16,
  dialogueFontSize,
  lineHeight,
  readingFontFamily = "serif",
  filterCharacter,
  focusMode,
  focusEffect,
  focusContentMode,
  themePalette,
  colorCache,
  theme = "light",
  markerConfigs = [],
  hiddenMarkerIds = [],
  showLineUnderline = false,
}: ScriptRendererProps) => {
  const { t } = useI18n();
  const readingFontStack = resolveReadingFontStack(readingFontFamily);
  const [markerTooltip, setMarkerTooltip] = useState<TooltipState | null>(null);

  const whitespaceLabels = useMemo(
    () => ({
      short: t("scriptRenderer.pauseShort"),
      mid: t("scriptRenderer.pauseMid"),
      long: t("scriptRenderer.pauseLong"),
      pure: "",
    }),
    [t]
  );

  const inlineMarkerConfigs = useMemo(() => {
    const safe = Array.isArray(markerConfigs) ? markerConfigs : [];
    return safe.filter((c) => isInlineLike(c));
  }, [markerConfigs]);

  const normalizedInlineMarkerConfigs = useMemo<MarkerConfig[]>(
    () =>
      inlineMarkerConfigs
        .filter((cfg) => typeof cfg.id === "string" && cfg.id.trim() !== "")
        .map((cfg) => ({
          id: String(cfg.id),
          type: typeof cfg.type === "string" ? cfg.type : undefined,
          matchMode: typeof cfg.matchMode === "string" ? cfg.matchMode : undefined,
          start: typeof cfg.start === "string" ? cfg.start : undefined,
          end: typeof cfg.end === "string" ? cfg.end : undefined,
          regex: typeof cfg.regex === "string" ? cfg.regex : undefined,
          priority: typeof cfg.priority === "number" ? cfg.priority : undefined,
          style: cfg.style,
          label: typeof cfg.label === "string" ? cfg.label : undefined,
        })),
    [inlineMarkerConfigs]
  );

  const inlineParseCacheRef = useRef(new Map());
  const inlineConfigSignature = useMemo(
    () => JSON.stringify(
      inlineMarkerConfigs.map((c) => ({
        id: c.id, start: c.start, end: c.end,
        matchMode: c.matchMode, regex: c.regex, priority: c.priority,
      }))
    ),
    [inlineMarkerConfigs]
  );

  const parseInlineLine = useMemo(() => {
    return (line: string) => {
      const key = `${inlineConfigSignature}::${line}`;
      const cache = inlineParseCacheRef.current;
      if (cache.has(key)) return cache.get(key);
      const parsed = parseInline(line, normalizedInlineMarkerConfigs);
      cache.set(key, parsed);
      if (cache.size > 2000) cache.clear();
      return parsed;
    };
  }, [inlineConfigSignature, normalizedInlineMarkerConfigs]);

  const context = useMemo(() => ({
    fontSize,
    dialogueFontSize,
    lineHeight,
    filterCharacter,
    focusMode,
    focusEffect,
    focusContentMode,
    colorCache,
    markerConfigs: Array.isArray(markerConfigs) ? markerConfigs : [],
    inlineMarkerConfigs: normalizedInlineMarkerConfigs,
    parseInlineLine,
    hiddenMarkerIds,
    whitespaceLabels,
    markerTooltipPrefix: t("scriptRenderer.markerTooltipPrefix", "標記"),
  }), [fontSize, dialogueFontSize, lineHeight, filterCharacter, focusMode, focusEffect, focusContentMode, colorCache, markerConfigs, normalizedInlineMarkerConfigs, parseInlineLine, hiddenMarkerIds, whitespaceLabels, t]);

  const markerLabelById = useMemo(() => {
    const map = new Map();
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

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const resolved = resolveMarkerTooltip(event.target);
    if (!resolved) { if (markerTooltip) setMarkerTooltip(null); return; }
    const text = `${t("scriptRenderer.markerTooltipPrefix", "標記")}: ${resolved.markerLabel}`;
    setMarkerTooltip({ text, x: event.clientX, y: event.clientY });
  };

  const handlePointerLeave = () => { if (markerTooltip) setMarkerTooltip(null); };

  const markerTooltipStyle = useMemo(() => {
    if (!markerTooltip) return null;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const preferTop = markerTooltip.y > TOOLTIP_TOP_FALLBACK_THRESHOLD;
    const unclampedLeft = markerTooltip.x + TOOLTIP_OFFSET;
    const maxLeft = Math.max(TOOLTIP_EDGE_PADDING, viewportWidth - TOOLTIP_MAX_WIDTH - TOOLTIP_EDGE_PADDING);
    const left = Math.min(Math.max(TOOLTIP_EDGE_PADDING, unclampedLeft), maxLeft);
    const top = preferTop ? markerTooltip.y - TOOLTIP_OFFSET : markerTooltip.y + TOOLTIP_OFFSET;
    return {
      left: `${left}px`, top: `${top}px`,
      maxWidth: `${TOOLTIP_MAX_WIDTH}px`,
      transform: preferTop ? "translateY(-100%)" : "none",
    };
  }, [markerTooltip]);

  return (
    <article
      className={`script-renderer relative${showLineUnderline ? " show-line-underline" : ""}`}
      style={{ fontFamily: readingFontStack, fontSize, lineHeight }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {ast ? (
        "type" in ast
          ? <NodeRenderer node={ast} context={context} />
          : <NodeRenderer node={{ type: "root", children: ast.children || [] }} context={context} />
      ) : null}
      {markerTooltip && (
        <div
          className="fixed z-[80] pointer-events-none rounded-md border border-border/60 bg-popover/95 px-2 py-1 text-xs text-popover-foreground shadow-lg backdrop-blur-sm"
          style={markerTooltipStyle || undefined}
        >
          {markerTooltip.text}
        </div>
      )}
    </article>
  );
});
