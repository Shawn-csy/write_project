"use client";

/**
 * ScriptContentRenderer
 * Renders engine RenderBlock[] data. Inline display policy is already applied
 * by @write/script-engine, so this component does not parse marker syntax.
 */

import type {
  CharacterBlock,
  InlineRun,
  LayerBlock,
  RangeBlock,
  RenderBlock,
  TextBlock,
} from "@write/script-engine";

// ─── inline token renderer ────────────────────────────────────────────────────

function renderRuns(runs: InlineRun[]): React.ReactNode[] {
  return runs.map((run, i) => {
    if (!run.style && !run.markerId) return run.text;
    return (
      <span key={i} style={run.style as React.CSSProperties | undefined}>
        {run.text}
      </span>
    );
  });
}

// ─── style helpers ────────────────────────────────────────────────────────────

const CHARACTER_COLORS = [
  "#b5533c", "#5a6bb5", "#c06080", "#607080", "#7a9080",
  "#8a8040", "#3a8070", "#506080", "#7070b0", "#9060a0",
];

const charColorMap = new Map<string, string>();

function getCharacterColor(name: string): string {
  const key = name.trim().toLowerCase();
  if (!charColorMap.has(key)) {
    const color = CHARACTER_COLORS[charColorMap.size % CHARACTER_COLORS.length];
    charColorMap.set(key, color);
  }
  return charColorMap.get(key)!;
}

type CSSStyle = React.CSSProperties;

function mergeStyles(...styles: (Record<string, string> | undefined | null)[]): CSSStyle {
  return Object.assign({}, ...styles.filter(Boolean)) as CSSStyle;
}

// ─── node renderers ───────────────────────────────────────────────────────────

function SceneHeadingBlockEl({ block }: { block: Extract<RenderBlock, { kind: "scene_heading" }> }) {
  const style = mergeStyles(block.style);
  return (
    <h3
      id={block.id}
      className="script-scene-heading"
      style={{
        display: "block",
        margin: "1.5em 0 0.5em",
        padding: "0.25em 0.5em",
        fontSize: "1em",
        ...style,
      }}
    >
      {block.text}
    </h3>
  );
}

function CharacterBlockEl({ block }: { block: CharacterBlock }) {
  const name = block.text;
  const color = name ? getCharacterColor(name) : "#D32F2F";
  const style = mergeStyles({ color, fontWeight: "bold" }, block.style);
  return (
    <strong
      className="script-character"
      style={{ display: "block", marginTop: "1em", marginBottom: "0.1em", ...style }}
    >
      {name}
    </strong>
  );
}

function TextBlockEl({ block }: { block: TextBlock }) {
  const style = mergeStyles(block.style);
  const className = `script-${block.kind}`;
  const margin = block.kind === "dialogue" ? "0 0 0.25em 0" : "0.25em 0";
  return (
    <>
      {block.lines.map((runs, i) => (
        <p
          key={`${block.kind}-${block.span?.lineStart ?? "line"}-${i}`}
          className={className}
          style={{ margin, whiteSpace: "pre-wrap", lineHeight: 1.85, ...style }}
        >
          {runs.length > 0 ? renderRuns(runs) : ""}
        </p>
      ))}
    </>
  );
}

function BlankBlockEl({ block }: { block: Extract<RenderBlock, { kind: "blank" }> }) {
  const style = mergeStyles(block.style);
  return <div className="script-blank" style={{ minHeight: "0.75em", ...style }} />;
}

function LayerBlockEl({ block }: { block: LayerBlock }) {
  const style = mergeStyles(block.style);
  return (
    <div
      className="script-layer"
      style={{ margin: "0.25em 0", padding: "0.1em 0", whiteSpace: "pre-wrap", ...style }}
    >
      {block.labelRuns.length > 0 && renderRuns(block.labelRuns)}
      {block.children && block.children.length > 0 && <BlockList blocks={block.children} />}
    </div>
  );
}

function RangeBlockEl({ block }: { block: RangeBlock }) {
  const style = mergeStyles(block.style);
  return (
    <div
      className="script-range"
      style={{ margin: "0.5em 0", paddingLeft: "8px", borderLeft: "2px solid currentColor", ...style }}
    >
      {block.startBlock && <LayerBlockEl block={block.startBlock} />}
      <BlockList blocks={block.children} />
      {block.endBlock && <LayerBlockEl block={block.endBlock} />}
    </div>
  );
}

function ScriptBlockEl({ block }: { block: RenderBlock }) {
  switch (block.kind) {
    case "scene_heading": return <SceneHeadingBlockEl block={block} />;
    case "character":     return <CharacterBlockEl block={block} />;
    case "dialogue":
    case "action":
    case "parenthetical":
    case "transition":
    case "centered":      return <TextBlockEl block={block} />;
    case "blank":         return <BlankBlockEl block={block} />;
    case "layer":         return <LayerBlockEl block={block} />;
    case "range":         return <RangeBlockEl block={block} />;
    default:
      return block.text ? (
        <p style={{ whiteSpace: "pre-wrap", color: "#888" }}>{block.text}</p>
      ) : null;
  }
}

function BlockList({ blocks }: { blocks: RenderBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <ScriptBlockEl key={`${block.kind}-${block.span?.lineStart ?? i}-${i}`} block={block} />
      ))}
    </>
  );
}

// ─── public export ────────────────────────────────────────────────────────────

export function ScriptContentRenderer({
  blocks,
  className,
}: {
  blocks: RenderBlock[];
  className?: string;
}) {
  charColorMap.clear();
  return (
    <article
      className={className}
      style={{
        fontFamily: "'Noto Serif TC', 'PingFang TC', 'Microsoft JhengHei', serif",
        fontSize: "1rem",
        lineHeight: 1.85,
        maxWidth: "72ch",
      }}
    >
      <BlockList blocks={blocks} />
    </article>
  );
}
