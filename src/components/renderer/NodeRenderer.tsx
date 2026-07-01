import React from 'react';
import { InlineRenderer } from './InlineRenderer';
import { LayerNode } from './nodes/LayerNode';
import { DualDialogueNode } from './nodes/DualDialogueNode';
import { SpeechNode } from './nodes/SpeechNode';
import { RangeNode } from './nodes/RangeNode';
import { parseInline } from '@write/script-engine';
import type { MarkerConfig } from '../../types/script';
import type { MarkerConfigLike, InlineNodeLike } from '../../types/renderer';

export interface RendererNode {
  type: string;
  text?: string;
  id?: string;
  markerId?: string;
  markerLabel?: string;
  lineStart?: number;
  lineEnd?: number;
  line?: number;
  endLine?: number;
  inRange?: string[];
  inlineLabel?: InlineNodeLike[];
  inlineEndLabel?: InlineNodeLike[];
  rangeRole?: string;
  layerType?: string;
  label?: string;
  endLabel?: string;
  scene_number?: string;
  raw?: string;
  content?: string;
  children?: RendererNode[];
  left?: RendererNode[];
  right?: RendererNode[];
  [key: string]: unknown;
}

export interface NodeRenderContext {
  fontSize?: number;
  dialogueFontSize?: number;
  lineHeight?: number;
  filterCharacter?: string | null;
  focusMode?: boolean;
  focusEffect?: string;
  focusContentMode?: string;
  colorCache?: React.MutableRefObject<Map<string, string>>;
  markerConfigs: MarkerConfigLike[];
  inlineMarkerConfigs: MarkerConfig[];
  parseInlineLine: (line: string) => Array<{ type: string; content?: string; id?: string }>;
  hiddenMarkerIds: string[];
  whitespaceLabels: Record<string, string>;
  markerTooltipPrefix: string | null;
}

const CHARACTER_COLOR_SEQUENCE = [
  'var(--marker-color-russet)',
  'var(--marker-color-slate-blue)',
  'var(--marker-color-pastel-rose)',
  'var(--marker-color-steel)',
  'var(--marker-color-sage)',
  'var(--marker-color-olive)',
  'var(--marker-color-verdigris)',
  'var(--marker-color-cadet)',
  'var(--marker-color-periwinkle)',
  'var(--marker-color-orchid)',
  'var(--marker-color-warm-gray)',
  'var(--marker-color-charcoal)',
];

const normalizeCharacterKey = (name = "") => String(name).trim().toLowerCase();

export const resolveCharacterColor = (characterName: string | undefined, context: NodeRenderContext) => {
  const key = normalizeCharacterKey(characterName);
  if (!key) return null;
  const cache = context?.colorCache?.current;
  if (!(cache instanceof Map)) return null;
  if (cache.has(key)) return cache.get(key);
  const color = CHARACTER_COLOR_SEQUENCE[cache.size % CHARACTER_COLOR_SEQUENCE.length];
  cache.set(key, color);
  return color;
};

export const getLineProps = (node: RendererNode) => {
  const start = node?.lineStart ?? node?.line ?? null;
  const end = node?.lineEnd ?? node?.endLine ?? start;
  if (!start) return {};
  return { "data-line-start": start, "data-line-end": end || start };
};

export const renderInlineLines = (node: RendererNode, context: NodeRenderContext) => {
  const lines = (node?.text || "").split("\n");
  const baseLine = Number.isFinite(node?.lineStart) ? node.lineStart : null;

  return lines.map((line, idx) => {
    const lineNumber = baseLine ? baseLine + idx : null;
    const inlineNodes = context.parseInlineLine
      ? context.parseInlineLine(line)
      : parseInline(line, context.inlineMarkerConfigs || []);
    const lineProps = lineNumber
      ? { "data-line-start": lineNumber, "data-line-end": lineNumber }
      : {};

    return (
      <span
        key={`${lineNumber || "line"}-${idx}`}
        className="script-line"
        style={{ display: "block", whiteSpace: "pre-wrap", minHeight: "1em" }}
        {...lineProps}
      >
        {inlineNodes && inlineNodes.length > 0 ? (
          <InlineRenderer nodes={inlineNodes} context={context} />
        ) : (
          line
        )}
      </span>
    );
  });
};

export const NodeRenderer = React.memo(function NodeRenderer({
  node,
  context,
  isDual = false,
}: {
  node: RendererNode;
  context: NodeRenderContext;
  isDual?: boolean;
}) {
  const { hiddenMarkerIds = [] } = context;

  const getFocusStyle = (): Record<string, string> => {
    return {};
  };

  const getRangeStyle = (): Record<string, string> => {
    if (!node.inRange || node.inRange.length === 0) return {};

    const activeRanges = node.inRange.filter(id => !hiddenMarkerIds.includes(id));
    if (activeRanges.length === 0) return {};

    const sanitizeRangeContentStyle = (style: Record<string, string> = {}) => {
      const {
        border, borderLeft, borderRight, borderTop, borderBottom,
        margin, marginLeft, marginRight, marginTop, marginBottom,
        padding, paddingLeft, paddingRight, paddingTop, paddingBottom,
        width, minWidth, maxWidth,
        display, position,
        left, right, top, bottom,
        ...contentStyle
      } = style;
      return contentStyle;
    };

    let mergedStyle: Record<string, string> = {};
    activeRanges.forEach(id => {
      const config = context.markerConfigs?.find(c => c.id === id);
      const candidate = config?.rangeStyle;
      if (candidate) Object.assign(mergedStyle, sanitizeRangeContentStyle(candidate));
    });

    return mergedStyle;
  };

  switch (node.type) {
    case 'root':
      return <>{(node.children || []).map((child, i) => <NodeRenderer key={i} node={child} context={context} />)}</>;

    case 'range':
      return (
        <RangeNode
          node={node}
          context={context}
          NodeRenderer={({ node: childNode, context: childContext }) => (
            <NodeRenderer node={childNode as RendererNode} context={childContext as NodeRenderContext} />
          )}
        />
      );

    case 'layer':
      return (
        <LayerNode
          node={node}
          context={context}
          NodeRenderer={({ node: childNode, context: childContext }) => (
            <NodeRenderer node={childNode as RendererNode} context={childContext as NodeRenderContext} />
          )}
        />
      );

    case 'whitespace': {
      const labels = context.whitespaceLabels || {};
      const label = labels[String(node.kind || "")] || '';
      const style = getFocusStyle();
      if (style.display === 'none') return null;
      return (
        <div className={`whitespace-block whitespace-${node.kind}`} style={style} {...getLineProps(node)}>
          <div className="whitespace-line"></div>
          <div className={`whitespace-line whitespace-label${label ? '' : ' whitespace-label-empty'}`}>{label}</div>
          <div className="whitespace-line"></div>
        </div>
      );
    }

    case 'dual_dialogue':
      return <DualDialogueNode node={node} context={context} NodeRenderer={NodeRenderer} />;

    case 'speech':
      return <SpeechNode node={node} context={context} isDual={isDual} NodeRenderer={NodeRenderer} />;

    case 'character': {
      const allMarkerConfigs = Array.isArray(context.markerConfigs) ? context.markerConfigs : [];
      const characterCfg = allMarkerConfigs.find((cfg) => cfg?.id === node.markerId)
        || allMarkerConfigs.find((cfg) => cfg?.id === 'character');
      const characterStyle = { ...(characterCfg?.style || {}) };
      const roleColor = resolveCharacterColor(node.text, context);
      if (roleColor) characterStyle.color = roleColor;
      const markerId = characterCfg?.id || '';
      const markerLabel = characterCfg?.label || markerId;
      return (
        <strong
          className={`script-character ${isDual ? 'max-w-full' : ''}`}
          style={{ display: "block", whiteSpace: "pre-wrap", marginBottom: "0.1em", ...characterStyle }}
          data-marker-id={markerId || undefined}
          data-marker-label={markerLabel || undefined}
          {...getLineProps(node)}
        >
          {node.text}
        </strong>
      );
    }

    case 'scene_heading': {
      const allMarkerConfigsForScene = Array.isArray(context.markerConfigs) ? context.markerConfigs : [];
      const sceneCfg = allMarkerConfigsForScene.find((cfg) => cfg?.id === node.markerId)
        || allMarkerConfigsForScene.find((cfg) => cfg?.parseAs === 'scene_heading');
      const sceneStyle = { ...getFocusStyle(), ...(sceneCfg?.style || {}) };
      if (sceneStyle.display === 'none') return null;
      return (
        <h3
          id={node.id || node.scene_number || node.text}
          className="script-scene-heading"
          data-marker-id={sceneCfg?.id || undefined}
          data-marker-label={sceneCfg?.label || sceneCfg?.id || undefined}
          style={sceneStyle}
          {...getLineProps(node)}
        >
          {node.text}
        </h3>
      );
    }

    case 'action': {
      const actionStyle = { ...getFocusStyle(), ...getRangeStyle() };
      if (actionStyle.display === 'none') return null;
      return (
        <p
          className={`script-action ${node.inRange ? 'in-range' : ''}`}
          style={{ whiteSpace: 'pre-wrap', ...actionStyle }}
          data-marker-id={node.markerId || undefined}
          data-marker-label={node.markerLabel || undefined}
          {...getLineProps(node)}
        >
          {renderInlineLines(node, context)}
        </p>
      );
    }

    case 'parenthetical':
      return (
        <div className={`script-parenthetical ${isDual ? 'max-w-full' : ''}`} style={{ whiteSpace: 'pre-wrap', fontSize: context.dialogueFontSize }}>
          {renderInlineLines(node, context)}
        </div>
      );

    case 'dialogue':
      return (
        <p className={`script-dialogue ${isDual ? 'max-w-full' : ''}`} style={{ whiteSpace: 'pre-wrap', fontSize: context.dialogueFontSize }}>
          {renderInlineLines(node, context)}
        </p>
      );

    case 'transition': {
      const transStyle = getFocusStyle();
      if (transStyle.display === 'none') return null;
      return (
        <p className="script-transition" style={{ whiteSpace: 'pre-wrap', ...transStyle }}>
          {renderInlineLines(node, context)}
        </p>
      );
    }

    case 'centered': {
      const centerStyle = getFocusStyle();
      if (centerStyle.display === 'none') return null;
      return (
        <div className="script-centered" style={{ whiteSpace: 'pre-wrap', ...centerStyle }}>
          {renderInlineLines(node, context)}
        </div>
      );
    }

    case 'blank': {
      const { border, borderLeft, borderRight, borderTop, borderBottom, borderColor, ...safeBlankStyle } = getRangeStyle();
      return (
        <div
          className={`blank-line my-1 ${node.inRange ? 'in-range' : ''}`}
          style={{ minHeight: '1em', ...safeBlankStyle }}
          {...getLineProps(node)}
        />
      );
    }

    case 'note':
      return null;

    default:
      if (node.text) return <p className="unknown text-muted-foreground">{node.text}</p>;
      return null;
  }
});
