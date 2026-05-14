import React, { useMemo, useRef, useState } from 'react';
import { InlineRenderer } from './InlineRenderer';
import { LayerNode } from './nodes/LayerNode';
import { DualDialogueNode } from './nodes/DualDialogueNode';
import { SpeechNode } from './nodes/SpeechNode';
import { parseInline } from '../../lib/parsers/inlineParser';
import { isInlineLike } from '../../lib/markerRules';
import { useI18n } from '../../contexts/I18nContext';
import { resolveReadingFontStack } from '../../constants/readingFonts';
import type { MarkerConfig } from '../../types/script';
import type { MarkerConfigLike, InlineNodeLike } from '../../types/renderer';

const TOOLTIP_OFFSET = 14;
const TOOLTIP_MAX_WIDTH = 280;
const TOOLTIP_EDGE_PADDING = 8;
const TOOLTIP_TOP_FALLBACK_THRESHOLD = 96;

const CHARACTER_COLOR_SEQUENCE = [
    'var(--marker-color-russet)',      // 1st: red
    'var(--marker-color-slate-blue)',  // 2nd: blue
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

interface RendererNode {
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

interface TooltipState {
    text: string;
    x: number;
    y: number;
}

interface ScriptRendererProps {
    ast: RendererNode | { children?: RendererNode[] } | null;
    fontSize?: number;
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

interface NodeRenderContext {
    fontSize?: number;
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
    markerTooltipPrefix: string;
}

const normalizeCharacterKey = (name = "") => String(name).trim().toLowerCase();

const resolveCharacterColor = (characterName: string | undefined, context: NodeRenderContext) => {
    const key = normalizeCharacterKey(characterName);
    if (!key) return null;
    const cache = context?.colorCache?.current;
    if (!(cache instanceof Map)) return null;
    if (cache.has(key)) return cache.get(key);
    const color = CHARACTER_COLOR_SEQUENCE[cache.size % CHARACTER_COLOR_SEQUENCE.length];
    cache.set(key, color);
    return color;
};

const getLineProps = (node: RendererNode) => {
    const start = node?.lineStart ?? node?.line ?? null;
    const end = node?.lineEnd ?? node?.endLine ?? start;
    if (!start) return {};
    return {
        "data-line-start": start,
        "data-line-end": end || start
    };
};

const renderInlineLines = (node: RendererNode, context: NodeRenderContext) => {
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
                style={{ 
                    display: "block", 
                    whiteSpace: "pre-wrap", 
                    minHeight: "1em"
                }}
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

import { RangeNode } from './nodes/RangeNode';

// --- Node Renderer ---
const NodeRenderer = React.memo(function NodeRenderer({ node, context, isDual = false }: { node: RendererNode; context: NodeRenderContext; isDual?: boolean }) {
    const { hiddenMarkerIds = [] } = context;

    // Non-marker styling controls are disabled. Marker configs are the only style source.
    const getFocusStyle = (): Record<string, string> => {
        return {};
    };

    // Apply optional range-content style for nodes wrapped inside active ranges.
    // Important: marker `style` is for marker lines themselves; content remains normal
    // unless `rangeStyle` is explicitly provided.
    const getRangeStyle = (): Record<string, string> => {
        if (!node.inRange || node.inRange.length === 0) return {};
        
        // Filter out hidden markers only; range content style is controlled by config.rangeStyle/style
        const activeRanges = node.inRange.filter(id => {
            if (hiddenMarkerIds.includes(id)) return false;
            return true;
        });

        if (activeRanges.length === 0) return {};

        const sanitizeRangeContentStyle = (style: Record<string, string> = {}) => {
            const {
                border,
                borderLeft,
                borderRight,
                borderTop,
                borderBottom,
                margin,
                marginLeft,
                marginRight,
                marginTop,
                marginBottom,
                padding,
                paddingLeft,
                paddingRight,
                paddingTop,
                paddingBottom,
                width,
                minWidth,
                maxWidth,
                display,
                position,
                left,
                right,
                top,
                bottom,
                ...contentStyle
            } = style;
            return contentStyle;
        };

        // Reconstruct style from active ranges using dedicated rangeStyle only.
        let mergedStyle: Record<string, string> = {};
        activeRanges.forEach(id => {
             const config = context.markerConfigs?.find(c => c.id === id);
             const candidate = config?.rangeStyle;
             if (candidate) {
                 Object.assign(mergedStyle, sanitizeRangeContentStyle(candidate));
             }
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
        
        case 'whitespace':
            const labels = context.whitespaceLabels || {};
            const label = labels[String(node.kind || "")] || '';
            const style = getFocusStyle(); 
            if (style.display === 'none') return null; // Optimization
            
            return (
                <div className={`whitespace-block whitespace-${node.kind}`} style={style} {...getLineProps(node)}>
                    <div className="whitespace-line"></div>
                    <div className={`whitespace-line whitespace-label${label ? '' : ' whitespace-label-empty'}`}>{label}</div>
                    <div className="whitespace-line"></div>
                </div>
            );

        case 'dual_dialogue':
            return <DualDialogueNode node={node} context={context} NodeRenderer={NodeRenderer} />;

        case 'speech':
            return <SpeechNode node={node} context={context} isDual={isDual} NodeRenderer={NodeRenderer} />;

        case 'character':
             // Character style should be controlled by marker config only.
             const allMarkerConfigs = Array.isArray(context.markerConfigs) ? context.markerConfigs : [];
             const characterCfg = allMarkerConfigs.find((cfg) => cfg?.id === node.markerId)
                 || allMarkerConfigs.find((cfg) => cfg?.id === 'character');
             const characterStyle = { ...(characterCfg?.style || {}) };
             const roleColor = resolveCharacterColor(node.text, context);
             if (roleColor) {
                characterStyle.color = roleColor;
             }
             const markerId = characterCfg?.id || '';
             const markerLabel = characterCfg?.label || markerId;
            return (
                <strong className={`script-character ${isDual ? 'max-w-full' : ''}`}
                     style={{
                        display: "block",
                        whiteSpace: "pre-wrap",
                        marginBottom: "0.1em",
                        ...characterStyle
                     }}
                     data-marker-id={markerId || undefined}
                     data-marker-label={markerLabel || undefined}
                     {...getLineProps(node)}
                 >
                     {node.text}
                 </strong>
            );

        case 'scene_heading':
            const allMarkerConfigsForScene = Array.isArray(context.markerConfigs) ? context.markerConfigs : [];
            const sceneCfg = allMarkerConfigsForScene.find((cfg) => cfg?.id === node.markerId)
                || allMarkerConfigsForScene.find((cfg) => cfg?.parseAs === 'scene_heading');
            const sceneStyle = {
                ...getFocusStyle(),
                ...(sceneCfg?.style || {}),
            };
            if (sceneStyle.display === 'none') return null;

            return (
                <h3 id={node.id || node.scene_number || node.text} 
                    className="script-scene-heading"
                    data-marker-id={sceneCfg?.id || undefined}
                    data-marker-label={sceneCfg?.label || sceneCfg?.id || undefined}
                    style={sceneStyle}
                    {...getLineProps(node)}
                >
                    {node.text}
                </h3>
            );

        case 'action':
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

        case 'parenthetical':
             // usually inside speech, handled by SpeechNode. If loose, apply style.
            return (
                <div className={`script-parenthetical ${isDual ? 'max-w-full' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>
                     {renderInlineLines(node, context)}
                </div>
            );

        case 'dialogue':
             // usually inside speech
            return (
                <p className={`script-dialogue ${isDual ? 'max-w-full' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>
                     {renderInlineLines(node, context)}
                </p>
            );
        
        case 'transition':
             const transStyle = getFocusStyle();
             if (transStyle.display === 'none') return null;

            return (
                <p className="script-transition" style={{ whiteSpace: 'pre-wrap', ...transStyle }}>
                     {renderInlineLines(node, context)}
                </p>
            );

        case 'centered':
             const centerStyle = getFocusStyle();
             if (centerStyle.display === 'none') return null;

            return (
                <div className="script-centered" style={{ whiteSpace: 'pre-wrap', ...centerStyle }}>
                    {renderInlineLines(node, context)}
                </div>
            );

        case 'blank':
             // Blank line also supports range-content style.
             // User request: Don't show border on blank lines inside hierarchy
             const { 
                border, borderLeft, borderRight, borderTop, borderBottom, borderColor,
                ...safeBlankStyle 
             } = getRangeStyle();
             
             return (
                 <div 
                     className={`blank-line my-1 ${node.inRange ? 'in-range' : ''}`} 
                     style={{ minHeight: '1em', ...safeBlankStyle }}
                     {...getLineProps(node)} 
                 />
             );

        case 'note':
             return null;

        default:
             if (node.text) return <p className="unknown text-muted-foreground">{node.text}</p>;
             return null;
    }
});

export const ScriptRenderer = React.memo(({ 
    ast, 
    fontSize = 16,
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
                id: c.id,
                start: c.start,
                end: c.end,
                matchMode: c.matchMode,
                regex: c.regex,
                priority: c.priority,
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
    }), [fontSize, filterCharacter, focusMode, focusEffect, focusContentMode, colorCache, markerConfigs, normalizedInlineMarkerConfigs, parseInlineLine, hiddenMarkerIds, whitespaceLabels, t]);

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
        const targetEl = target instanceof Element ? target : null;
        if (!targetEl || typeof targetEl.closest !== "function") return null;
        const markerEl = targetEl.closest("[data-marker-id]");
        if (!markerEl) return null;
        const markerId = String(markerEl.getAttribute("data-marker-id") || "").trim();
        if (!markerId) return null;
        const markerLabel = String(markerEl.getAttribute("data-marker-label") || "").trim() || markerLabelById.get(markerId) || markerId;
        return {
            markerId,
            markerLabel,
        };
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
        const resolved = resolveMarkerTooltip(event.target);
        if (!resolved) {
            if (markerTooltip) setMarkerTooltip(null);
            return;
        }
        const text = `${t("scriptRenderer.markerTooltipPrefix", "標記")}: ${resolved.markerLabel}`;
        setMarkerTooltip({
            text,
            x: event.clientX,
            y: event.clientY,
        });
    };

    const handlePointerLeave = () => {
        if (markerTooltip) setMarkerTooltip(null);
    };

    const markerTooltipStyle = useMemo(() => {
        if (!markerTooltip) return null;
        const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
        const preferTop = markerTooltip.y > TOOLTIP_TOP_FALLBACK_THRESHOLD;
        const unclampedLeft = markerTooltip.x + TOOLTIP_OFFSET;
        const maxLeft = Math.max(TOOLTIP_EDGE_PADDING, viewportWidth - TOOLTIP_MAX_WIDTH - TOOLTIP_EDGE_PADDING);
        const left = Math.min(Math.max(TOOLTIP_EDGE_PADDING, unclampedLeft), maxLeft);
        const top = preferTop
            ? markerTooltip.y - TOOLTIP_OFFSET
            : markerTooltip.y + TOOLTIP_OFFSET;

        return {
            left: `${left}px`,
            top: `${top}px`,
            maxWidth: `${TOOLTIP_MAX_WIDTH}px`,
            transform: preferTop ? "translateY(-100%)" : "none",
        };
    }, [markerTooltip]);

    return (
        <article
            className={`script-renderer relative${showLineUnderline ? " show-line-underline" : ""}`}
            style={{ fontFamily: readingFontStack }}
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
