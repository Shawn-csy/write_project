"use client";

/**
 * ScriptContentRenderer
 * Renders an engine AstNode tree. Inline tokens come from engine parseInline()
 * via the InlineConfigCtx context — same parser as Vite editor preview.
 */

import { createContext, useContext } from "react";
import type { AstNode, MarkerConfig, InlineToken } from "@write/script-engine";
import { parseInline } from "@write/script-engine";

// ─── inline render context ────────────────────────────────────────────────────

const InlineConfigCtx = createContext<MarkerConfig[]>([]);

function useInlineConfigs() {
  return useContext(InlineConfigCtx);
}

// ─── inline token renderer ────────────────────────────────────────────────────

function renderTokens(tokens: InlineToken[]): React.ReactNode[] {
  return tokens.map((tok, i) => {
    if (tok.type === "text") return tok.content;
    return (
      <span key={i} style={tok.style as React.CSSProperties | undefined}>
        {tok.content}
      </span>
    );
  });
}

/**
 * Render inline content for a node.
 * Prefers pre-parsed node.inline tokens (from engine DirectASTBuilder).
 * Falls back to calling parseInline on node.text if needed.
 */
function InlineContent({ node }: { node: AstNode }): React.ReactNode {
  const configs = useInlineConfigs();
  const text = typeof node.text === "string" ? node.text : "";

  // Engine DirectASTBuilder pre-parses inline tokens. Use them if present.
  const tokens: InlineToken[] = Array.isArray(node.inline) && node.inline.length > 0
    ? (node.inline as InlineToken[])
    : parseInline(text, configs);

  if (tokens.length === 0) return text;
  return <>{renderTokens(tokens)}</>;
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

function SceneHeadingNode({ node }: { node: AstNode }) {
  const style = mergeStyles(node.style);
  return (
    <h3
      id={node.id as string | undefined}
      className="script-scene-heading"
      style={{
        display: "block",
        margin: "1.5em 0 0.5em",
        padding: "0.25em 0.5em",
        fontSize: "1em",
        ...style,
      }}
    >
      {String(node.text ?? "")}
    </h3>
  );
}

function CharacterNode({ node }: { node: AstNode }) {
  const name = typeof node.text === "string" ? node.text : "";
  const color = name ? getCharacterColor(name) : "#D32F2F";
  const style = mergeStyles({ color, fontWeight: "bold" }, node.style);
  return (
    <strong
      className="script-character"
      style={{ display: "block", marginTop: "1em", marginBottom: "0.1em", ...style }}
    >
      {name}
    </strong>
  );
}

function DialogueNode({ node }: { node: AstNode }) {
  const style = mergeStyles(node.rangeStyle, node.style);
  return (
    <p
      className="script-dialogue"
      style={{ margin: "0 0 0.25em 0", whiteSpace: "pre-wrap", ...style }}
    >
      <InlineContent node={node} />
    </p>
  );
}

function ActionNode({ node }: { node: AstNode }) {
  const style = mergeStyles(node.rangeStyle, node.style);
  return (
    <p
      className="script-action"
      style={{ margin: "0.25em 0", whiteSpace: "pre-wrap", lineHeight: 1.85, ...style }}
    >
      <InlineContent node={node} />
    </p>
  );
}

function BlankNode({ node }: { node: AstNode }) {
  const style = mergeStyles(node.rangeStyle);
  return <div className="script-blank" style={{ minHeight: "0.75em", ...style }} />;
}

function LayerNode({ node }: { node: AstNode }) {
  const style = mergeStyles(node.style);
  return (
    <div
      className="script-layer"
      style={{ margin: "0.25em 0", padding: "0.1em 0", whiteSpace: "pre-wrap", ...style }}
    >
      {Boolean(node.text) && <InlineContent node={node} />}
      {node.children && node.children.length > 0 && <NodeList nodes={node.children} />}
    </div>
  );
}

function RangeNode({ node }: { node: AstNode }) {
  const style = mergeStyles(node.style);
  return (
    <div
      className="script-range"
      style={{ margin: "0.5em 0", paddingLeft: "8px", borderLeft: "2px solid currentColor", ...style }}
    >
      {node.children && <NodeList nodes={node.children} />}
    </div>
  );
}

function ScriptNodeEl({ node }: { node: AstNode }) {
  switch (node.type) {
    case "scene_heading": return <SceneHeadingNode node={node} />;
    case "character":     return <CharacterNode node={node} />;
    case "dialogue":      return <DialogueNode node={node} />;
    case "action":        return <ActionNode node={node} />;
    case "blank":         return <BlankNode node={node} />;
    case "layer":         return <LayerNode node={node} />;
    case "range":         return <RangeNode node={node} />;
    default:
      return node.text ? (
        <p style={{ whiteSpace: "pre-wrap", color: "#888" }}>{String(node.text)}</p>
      ) : null;
  }
}

function NodeList({ nodes }: { nodes: AstNode[] }) {
  return (
    <>
      {nodes.map((n, i) => (
        <ScriptNodeEl key={`${n.type}-${n.lineStart ?? i}`} node={n} />
      ))}
    </>
  );
}

// ─── public export ────────────────────────────────────────────────────────────

export function ScriptContentRenderer({
  root,
  markerConfigs = [],
  className,
}: {
  root: AstNode;
  markerConfigs?: MarkerConfig[];
  className?: string;
}) {
  charColorMap.clear();
  return (
    <InlineConfigCtx.Provider value={markerConfigs}>
      <article
        className={className}
        style={{
          fontFamily: "'Noto Serif TC', 'PingFang TC', 'Microsoft JhengHei', serif",
          fontSize: "1rem",
          lineHeight: 1.85,
          maxWidth: "72ch",
        }}
      >
        <NodeList nodes={root.children ?? []} />
      </article>
    </InlineConfigCtx.Provider>
  );
}
