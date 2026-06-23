import React, { useMemo } from "react";
import type {
  CharacterBlock,
  InlineRun,
  LayerBlock,
  RangeBlock,
  RenderBlock,
  TextBlock,
} from "@write/script-engine";
import { useMarkerTooltip, type MarkerConfigLike } from "./useMarkerTooltip";

export const CHARACTER_COLOR_SEQUENCE = [
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

export type { MarkerConfigLike } from "./useMarkerTooltip";

export interface RenderBlockRendererProps {
  blocks: RenderBlock[];
  fontSize?: number;
  lineHeight?: number;
  readingFontFamily?: string;
  hiddenMarkerIds?: string[];
  markerConfigs?: MarkerConfigLike[];
  showMarkerTooltip?: boolean;
  markerTooltipPrefix?: string;
  showLineUnderline?: boolean;
  colorCache?: React.MutableRefObject<Map<string, string>>;
  className?: string;
}

const normalizeCharacterKey = (name = "") => String(name).trim().toLowerCase();

const resolveCharacterColor = (
  characterName: string,
  cacheRef?: React.MutableRefObject<Map<string, string>>
) => {
  const key = normalizeCharacterKey(characterName);
  if (!key) return null;
  const cache = cacheRef?.current;
  if (!(cache instanceof Map)) return null;
  if (cache.has(key)) return cache.get(key);
  const color = CHARACTER_COLOR_SEQUENCE[cache.size % CHARACTER_COLOR_SEQUENCE.length];
  cache.set(key, color);
  return color;
};

const mergeStyles = (
  ...styles: (Record<string, string> | undefined | null)[]
): React.CSSProperties => Object.assign({}, ...styles.filter(Boolean)) as React.CSSProperties;

const getLineProps = (block: RenderBlock) => {
  const start = block.span?.lineStart ?? null;
  const end = block.span?.lineEnd ?? start;
  if (!start) return {};
  return { "data-line-start": start, "data-line-end": end || start };
};

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
        const markerLabel = run.markerId ? markerLabelById.get(run.markerId) || run.markerId : undefined;
        return (
          <span
            key={i}
            style={run.style as React.CSSProperties | undefined}
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

function TextBlockView({
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
      {block.lines.map((lineRuns, i) => (
        <p
          key={`${block.kind}-${block.span?.lineStart ?? "line"}-${i}`}
          className={`script-${block.kind}`}
          style={{ whiteSpace: "pre-wrap", ...mergeStyles(block.style) }}
          {...getLineProps(block)}
        >
          <span className="script-line" style={{ display: "block", whiteSpace: "pre-wrap", minHeight: "1em" }}>
            {lineRuns.length > 0 ? (
              <InlineRuns runs={lineRuns} hiddenMarkerIds={hiddenMarkerIds} markerLabelById={markerLabelById} />
            ) : (
              ""
            )}
          </span>
        </p>
      ))}
    </>
  );
}

function CharacterBlockView({
  block,
  colorCache,
}: {
  block: CharacterBlock;
  colorCache?: React.MutableRefObject<Map<string, string>>;
}) {
  const roleColor = resolveCharacterColor(block.text, colorCache);
  return (
    <strong
      className="script-character"
      style={{ display: "block", whiteSpace: "pre-wrap", marginBottom: "0.1em", ...mergeStyles(block.style), ...(roleColor ? { color: roleColor } : {}) }}
      data-marker-id={block.markerId || undefined}
      {...getLineProps(block)}
    >
      {block.text}
    </strong>
  );
}

function LayerBlockView({
  block,
  hiddenMarkerIds,
  markerLabelById,
  colorCache,
}: {
  block: LayerBlock;
  hiddenMarkerIds: string[];
  markerLabelById: Map<string, string>;
  colorCache?: React.MutableRefObject<Map<string, string>>;
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

function RangeBlockView({
  block,
  hiddenMarkerIds,
  markerLabelById,
  colorCache,
}: {
  block: RangeBlock;
  hiddenMarkerIds: string[];
  markerLabelById: Map<string, string>;
  colorCache?: React.MutableRefObject<Map<string, string>>;
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
        <LayerBlockView block={block.startBlock} hiddenMarkerIds={hiddenMarkerIds} markerLabelById={markerLabelById} colorCache={colorCache} />
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
        <LayerBlockView block={block.endBlock} hiddenMarkerIds={hiddenMarkerIds} markerLabelById={markerLabelById} colorCache={colorCache} />
      )}
    </div>
  );
}

function BlockView({
  block,
  hiddenMarkerIds,
  markerLabelById,
  colorCache,
}: {
  block: RenderBlock;
  hiddenMarkerIds: string[];
  markerLabelById: Map<string, string>;
  colorCache?: React.MutableRefObject<Map<string, string>>;
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
      return <CharacterBlockView block={block} colorCache={colorCache} />;
    case "dialogue":
    case "action":
    case "parenthetical":
    case "transition":
    case "centered":
      return <TextBlockView block={block} hiddenMarkerIds={hiddenMarkerIds} markerLabelById={markerLabelById} />;
    case "blank":
      return <div className="script-blank" style={{ minHeight: "1em", ...mergeStyles(block.style) }} {...getLineProps(block)} />;
    case "layer":
      return <LayerBlockView block={block} hiddenMarkerIds={hiddenMarkerIds} markerLabelById={markerLabelById} colorCache={colorCache} />;
    case "range":
      return <RangeBlockView block={block} hiddenMarkerIds={hiddenMarkerIds} markerLabelById={markerLabelById} colorCache={colorCache} />;
    case "unknown":
      return block.text ? (
        <p className="script-unknown" style={mergeStyles(block.style)} {...getLineProps(block)}>
          {block.text}
        </p>
      ) : null;
    default:
      return null;
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
  colorCache?: React.MutableRefObject<Map<string, string>>;
}) {
  return (
    <>
      {blocks.map((block, i) => (
        <BlockView
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

export const RenderBlockRenderer = React.memo(function RenderBlockRenderer({
  blocks,
  fontSize = 16,
  lineHeight,
  readingFontFamily = "serif",
  hiddenMarkerIds = [],
  markerConfigs = [],
  showMarkerTooltip = true,
  markerTooltipPrefix = "標記",
  showLineUnderline = false,
  colorCache,
  className,
}: RenderBlockRendererProps) {
  const resolvedColorCache = colorCache ?? { current: new Map<string, string>() };
  const effectivePrefix = showMarkerTooltip ? markerTooltipPrefix : null;
  const { markerTooltip, markerTooltipStyle, handlePointerMove, handlePointerLeave, markerLabelById } =
    useMarkerTooltip(markerConfigs, effectivePrefix);

  return (
    <article
      className={`script-renderer render-block-renderer relative${showLineUnderline ? " show-line-underline" : ""}${className ? ` ${className}` : ""}`}
      style={{ fontFamily: readingFontFamily, fontSize, lineHeight }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <BlockList
        blocks={blocks}
        hiddenMarkerIds={hiddenMarkerIds}
        markerLabelById={markerLabelById}
        colorCache={resolvedColorCache}
      />
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
