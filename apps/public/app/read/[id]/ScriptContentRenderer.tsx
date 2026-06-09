"use client";

/**
 * ScriptContentRenderer
 *
 * Renders engine RenderBlock[] for the public Next.js reader.
 * Supports hiddenMarkerIds and markerConfigs (for tooltip labels) to match
 * Vite's RenderBlockRenderer behaviour.
 *
 * Note: character color uses CSS custom properties (--marker-color-*) so the
 * palette is consistent with the Vite editor/reader.
 */

import React, { useMemo, useState } from "react";
import type {
  CharacterBlock,
  InlineRun,
  LayerBlock,
  RangeBlock,
  RenderBlock,
  TextBlock,
} from "@write/script-engine";

// ─── character color sequence (mirrors RenderBlockRenderer) ──────────────────

const CHARACTER_COLOR_SEQUENCE = [
  "var(--marker-color-russet)",
  "var(--marker-color-slate-blue)",
  "var(--marker-color-pastel-rose)",
  "var(--marker-color-steel)",
  "var(--marker-color-sage)",
  "var(--marker-color-olive)",
  "var(--marker-color-verdigris)",
  "var(--marker-color-cadet)",
  "var(--marker-color-periwinkle)",
  "var(--marker-color-orchid)",
  "var(--marker-color-warm-gray)",
  "var(--marker-color-charcoal)",
];

function resolveCharacterColor(name: string, cache: Map<string, string>): string | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  const color = CHARACTER_COLOR_SEQUENCE[cache.size % CHARACTER_COLOR_SEQUENCE.length];
  cache.set(key, color);
  return color;
}

// ─── style helpers ────────────────────────────────────────────────────────────

type CSSStyle = React.CSSProperties;

function mergeStyles(...styles: (Record<string, string> | undefined | null)[]): CSSStyle {
  return Object.assign({}, ...styles.filter(Boolean)) as CSSStyle;
}

const getLineProps = (block: RenderBlock) => {
  const start = block.span?.lineStart ?? null;
  const end = block.span?.lineEnd ?? start;
  if (!start) return {};
  return { "data-line-start": start, "data-line-end": end || start };
};

// ─── inline runs ─────────────────────────────────────────────────────────────

function InlineRuns({
  runs,
  hiddenMarkerIds,
  markerLabelById,
}: {
  runs: InlineRun[];
  hiddenMarkerIds: string[];
  markerLabelById: Map<string, string>;
}) {
  return (
    <>
      {runs.map((run, i) => {
        if (run.markerId && hiddenMarkerIds.includes(run.markerId)) return null;
        if (!run.style && !run.markerId) return <span key={i}>{run.text}</span>;
        const markerLabel = run.markerId
          ? markerLabelById.get(run.markerId) || run.markerId
          : undefined;
        return (
          <span
            key={i}
            style={run.style as CSSStyle | undefined}
            data-marker-id={run.markerId || undefined}
            data-marker-label={markerLabel}
          >
            {run.text}
          </span>
        );
      })}
    </>
  );
}

// ─── block components ─────────────────────────────────────────────────────────

function CharacterBlockEl({
  block,
  colorCache,
}: {
  block: CharacterBlock;
  colorCache: Map<string, string>;
}) {
  const color = resolveCharacterColor(block.text ?? "", colorCache);
  return (
    <strong
      className="script-character"
      style={{
        display: "block",
        whiteSpace: "pre-wrap",
        marginTop: "1em",
        marginBottom: "0.1em",
        ...mergeStyles(block.style),
        ...(color ? { color } : {}),
      }}
      data-marker-id={block.markerId || undefined}
      {...getLineProps(block)}
    >
      {block.text}
    </strong>
  );
}

function TextBlockEl({
  block,
  hiddenMarkerIds,
  markerLabelById,
}: {
  block: TextBlock;
  hiddenMarkerIds: string[];
  markerLabelById: Map<string, string>;
}) {
  return (
    <>
      {block.lines.map((runs, i) => (
        <p
          key={`${block.kind}-${block.span?.lineStart ?? "line"}-${i}`}
          className={`script-${block.kind}`}
          style={{ whiteSpace: "pre-wrap", ...mergeStyles(block.style) }}
          {...getLineProps(block)}
        >
          <span style={{ display: "block", whiteSpace: "pre-wrap", minHeight: "1em" }}>
            {runs.length > 0 ? (
              <InlineRuns runs={runs} hiddenMarkerIds={hiddenMarkerIds} markerLabelById={markerLabelById} />
            ) : ""}
          </span>
        </p>
      ))}
    </>
  );
}

function LayerBlockEl({
  block,
  hiddenMarkerIds,
  markerLabelById,
  colorCache,
}: {
  block: LayerBlock;
  hiddenMarkerIds: string[];
  markerLabelById: Map<string, string>;
  colorCache: Map<string, string>;
}) {
  if (block.markerId && hiddenMarkerIds.includes(block.markerId)) return null;
  return (
    <div
      className="layer-node script-layer"
      style={mergeStyles(block.style)}
      data-marker-id={block.markerId || undefined}
      {...getLineProps(block)}
    >
      {block.labelRuns.length > 0 && (
        <div className="layer-label">
          <InlineRuns runs={block.labelRuns} hiddenMarkerIds={hiddenMarkerIds} markerLabelById={markerLabelById} />
        </div>
      )}
      {block.children && block.children.length > 0 && (
        <BlockList
          blocks={block.children}
          hiddenMarkerIds={hiddenMarkerIds}
          markerLabelById={markerLabelById}
          colorCache={colorCache}
        />
      )}
    </div>
  );
}

function RangeBlockEl({
  block,
  hiddenMarkerIds,
  markerLabelById,
  colorCache,
}: {
  block: RangeBlock;
  hiddenMarkerIds: string[];
  markerLabelById: Map<string, string>;
  colorCache: Map<string, string>;
}) {
  const hidden = block.markerId ? hiddenMarkerIds.includes(block.markerId) : false;
  return (
    <div
      className="range-node script-range"
      style={hidden ? undefined : mergeStyles(block.style)}
      data-marker-id={block.markerId || undefined}
      {...getLineProps(block)}
    >
      {!hidden && block.startBlock && (
        <LayerBlockEl
          block={block.startBlock}
          hiddenMarkerIds={hiddenMarkerIds}
          markerLabelById={markerLabelById}
          colorCache={colorCache}
        />
      )}
      <div className="range-content">
        <BlockList
          blocks={block.children}
          hiddenMarkerIds={hiddenMarkerIds}
          markerLabelById={markerLabelById}
          colorCache={colorCache}
        />
      </div>
      {!hidden && block.endBlock && (
        <LayerBlockEl
          block={block.endBlock}
          hiddenMarkerIds={hiddenMarkerIds}
          markerLabelById={markerLabelById}
          colorCache={colorCache}
        />
      )}
    </div>
  );
}

function ScriptBlockEl({
  block,
  hiddenMarkerIds,
  markerLabelById,
  colorCache,
}: {
  block: RenderBlock;
  hiddenMarkerIds: string[];
  markerLabelById: Map<string, string>;
  colorCache: Map<string, string>;
}) {
  switch (block.kind) {
    case "scene_heading":
      return (
        <h3
          id={block.id}
          className="script-scene-heading"
          style={mergeStyles(block.style)}
          data-marker-id={block.markerId || undefined}
          {...getLineProps(block)}
        >
          {block.text}
        </h3>
      );
    case "character":
      return <CharacterBlockEl block={block} colorCache={colorCache} />;
    case "dialogue":
    case "action":
    case "parenthetical":
    case "transition":
    case "centered":
      return (
        <TextBlockEl
          block={block}
          hiddenMarkerIds={hiddenMarkerIds}
          markerLabelById={markerLabelById}
        />
      );
    case "blank":
      return (
        <div
          className="script-blank"
          style={{ minHeight: "1em", ...mergeStyles(block.style) }}
          {...getLineProps(block)}
        />
      );
    case "layer":
      return (
        <LayerBlockEl
          block={block}
          hiddenMarkerIds={hiddenMarkerIds}
          markerLabelById={markerLabelById}
          colorCache={colorCache}
        />
      );
    case "range":
      return (
        <RangeBlockEl
          block={block}
          hiddenMarkerIds={hiddenMarkerIds}
          markerLabelById={markerLabelById}
          colorCache={colorCache}
        />
      );
    default:
      return block.text ? (
        <p
          className="script-unknown"
          style={mergeStyles(block.style)}
          {...getLineProps(block)}
        >
          {block.text}
        </p>
      ) : null;
  }
}

function BlockList({
  blocks,
  hiddenMarkerIds,
  markerLabelById,
  colorCache,
}: {
  blocks: RenderBlock[];
  hiddenMarkerIds: string[];
  markerLabelById: Map<string, string>;
  colorCache: Map<string, string>;
}) {
  return (
    <>
      {blocks.map((block, i) => (
        <ScriptBlockEl
          key={`${block.kind}-${block.span?.lineStart ?? i}-${i}`}
          block={block}
          hiddenMarkerIds={hiddenMarkerIds}
          markerLabelById={markerLabelById}
          colorCache={colorCache}
        />
      ))}
    </>
  );
}

// ─── tooltip ──────────────────────────────────────────────────────────────────

interface TooltipState { text: string; x: number; y: number }
const TOOLTIP_OFFSET = 14;
const TOOLTIP_MAX_WIDTH = 280;
const TOOLTIP_EDGE_PADDING = 8;
const TOOLTIP_TOP_FALLBACK_THRESHOLD = 96;

function getMarkerElement(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  let el: Element | null = target;
  while (el) {
    if (el.getAttribute("data-marker-id")) return el;
    el = el.parentElement;
  }
  return null;
}

// ─── public export ────────────────────────────────────────────────────────────

interface MarkerConfigLike {
  id?: string;
  label?: string;
  name?: string;
  displayName?: string;
}

export function ScriptContentRenderer({
  blocks,
  markerConfigs = [],
  hiddenMarkerIds = [],
  fontSize = 16,
  lineHeight = 1.85,
  readingFontFamily = "'Noto Serif TC', 'PingFang TC', 'Microsoft JhengHei', serif",
  showMarkerTooltip = false,
  className,
}: {
  blocks: RenderBlock[];
  markerConfigs?: MarkerConfigLike[];
  hiddenMarkerIds?: string[];
  fontSize?: number;
  lineHeight?: number;
  readingFontFamily?: string;
  showMarkerTooltip?: boolean;
  className?: string;
}) {
  // Instance-scoped color cache — no cross-request contamination.
  const colorCache = useMemo(() => new Map<string, string>(), [blocks]);

  const markerLabelById = useMemo(() => {
    const map = new Map<string, string>();
    markerConfigs.forEach((cfg) => {
      const id = String(cfg?.id || "").trim();
      if (!id) return;
      map.set(id, String(cfg?.label || cfg?.name || cfg?.displayName || id).trim());
    });
    return map;
  }, [markerConfigs]);

  const normalizedHiddenIds = useMemo(
    () => (hiddenMarkerIds || []).map((id) => String(id || "").trim()).filter(Boolean),
    [hiddenMarkerIds]
  );

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!showMarkerTooltip) { if (tooltip) setTooltip(null); return; }
    const markerEl = getMarkerElement(e.target);
    if (!markerEl) { if (tooltip) setTooltip(null); return; }
    const markerId = markerEl.getAttribute("data-marker-id");
    if (!markerId) { if (tooltip) setTooltip(null); return; }
    const label = markerEl.getAttribute("data-marker-label") || markerLabelById.get(markerId) || markerId;
    setTooltip({ text: `標記: ${label}`, x: e.clientX, y: e.clientY });
  };

  const tooltipStyle = useMemo(() => {
    if (!tooltip) return null;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const preferTop = tooltip.y > TOOLTIP_TOP_FALLBACK_THRESHOLD;
    const left = Math.min(
      Math.max(TOOLTIP_EDGE_PADDING, tooltip.x + TOOLTIP_OFFSET),
      Math.max(TOOLTIP_EDGE_PADDING, viewportWidth - TOOLTIP_MAX_WIDTH - TOOLTIP_EDGE_PADDING)
    );
    const top = preferTop ? tooltip.y - TOOLTIP_OFFSET : tooltip.y + TOOLTIP_OFFSET;
    return {
      left: `${left}px`,
      top: `${top}px`,
      maxWidth: `${TOOLTIP_MAX_WIDTH}px`,
      transform: preferTop ? "translateY(-100%)" : "none",
    };
  }, [tooltip]);

  return (
    <article
      className={`script-renderer render-block-renderer${className ? ` ${className}` : ""}`}
      style={{ fontFamily: readingFontFamily, fontSize, lineHeight, maxWidth: "72ch" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => { if (tooltip) setTooltip(null); }}
    >
      <BlockList
        blocks={blocks}
        hiddenMarkerIds={normalizedHiddenIds}
        markerLabelById={markerLabelById}
        colorCache={colorCache}
      />
      {tooltip && (
        <div
          className="fixed z-[80] pointer-events-none rounded-md border px-2 py-1 text-xs shadow-lg"
          style={tooltipStyle || undefined}
        >
          {tooltip.text}
        </div>
      )}
    </article>
  );
}
