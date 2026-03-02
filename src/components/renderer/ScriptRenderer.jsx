import React, { useMemo, useRef, useState } from 'react';
import { InlineRenderer } from './InlineRenderer';
import { LayerNode } from './nodes/LayerNode';
import { DualDialogueNode } from './nodes/DualDialogueNode';
import { SpeechNode } from './nodes/SpeechNode';
import { parseInline } from '../../lib/parsers/inlineParser.js';
import { isInlineLike } from '../../lib/markerRules.js';
import { useI18n } from '../../contexts/I18nContext';

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

const normalizeCharacterKey = (name = "") => String(name).trim().toLowerCase();

const resolveCharacterColor = (characterName, context) => {
    const key = normalizeCharacterKey(characterName);
    if (!key) return null;
    const cache = context?.colorCache?.current;
    if (!(cache instanceof Map)) return null;
    if (cache.has(key)) return cache.get(key);
    const color = CHARACTER_COLOR_SEQUENCE[cache.size % CHARACTER_COLOR_SEQUENCE.length];
    cache.set(key, color);
    return color;
};

const getLineProps = (node) => {
    const start = node?.lineStart ?? node?.line ?? null;
    const end = node?.lineEnd ?? node?.endLine ?? start;
    if (!start) return {};
    return {
        "data-line-start": start,
        "data-line-end": end || start
    };
};

const renderInlineLines = (node, context) => {
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
const NodeRenderer = React.memo(({ node, context, isDual = false }) => {
    const { hiddenMarkerIds = [] } = context;

    // Non-marker styling controls are disabled. Marker configs are the only style source.
    const getFocusStyle = () => {
        return {};
    };

    // Apply optional range-content style for nodes wrapped inside active ranges.
    // Important: marker `style` is for marker lines themselves; content remains normal
    // unless `rangeStyle` is explicitly provided.
    const getRangeStyle = () => {
        if (!node.inRange || node.inRange.length === 0) return {};
        
        // Filter out hidden markers only; range content style is controlled by config.rangeStyle/style
        const activeRanges = node.inRange.filter(id => {
            if (hiddenMarkerIds.includes(id)) return false;
            return true;
        });

        if (activeRanges.length === 0) return {};

        const sanitizeRangeContentStyle = (style = {}) => {
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
        let mergedStyle = {};
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
            return <>{node.children.map((child, i) => <NodeRenderer key={i} node={child} context={context} />)}</>;
            
        case 'range':
            return <RangeNode node={node} context={context} NodeRenderer={NodeRenderer} />;

        case 'layer':
            return <LayerNode node={node} context={context} NodeRenderer={NodeRenderer} />;
        
        case 'whitespace':
            const labels = context.whitespaceLabels || {};
            const label = labels[node.kind] || '';
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
            const sceneStyle = getFocusStyle();
            if (sceneStyle.display === 'none') return null;

            return (
                <h3 id={node.id || node.scene_number || node.text} 
                    className="script-scene-heading"
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
}) => {
    const { t } = useI18n();
    const [markerTooltip, setMarkerTooltip] = useState(null);
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
        return (line) => {
            const key = `${inlineConfigSignature}::${line}`;
            const cache = inlineParseCacheRef.current;
            if (cache.has(key)) return cache.get(key);
            const parsed = parseInline(line, inlineMarkerConfigs);
            cache.set(key, parsed);
            if (cache.size > 2000) cache.clear();
            return parsed;
        };
    }, [inlineConfigSignature, inlineMarkerConfigs]);

    const context = useMemo(() => ({
        fontSize,
        filterCharacter,
        focusMode,
        focusEffect,
        focusContentMode,
        colorCache,
        markerConfigs: Array.isArray(markerConfigs) ? markerConfigs : [],
        inlineMarkerConfigs,
        parseInlineLine,
        hiddenMarkerIds,
        whitespaceLabels,
        markerTooltipPrefix: t("scriptRenderer.markerTooltipPrefix", "標記"),
    }), [fontSize, filterCharacter, focusMode, focusEffect, focusContentMode, colorCache, markerConfigs, inlineMarkerConfigs, parseInlineLine, hiddenMarkerIds, whitespaceLabels, t]);

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

    const resolveMarkerTooltip = (target) => {
        if (!target || typeof target.closest !== "function") return null;
        const markerEl = target.closest("[data-marker-id]");
        if (!markerEl) return null;
        const markerId = String(markerEl.getAttribute("data-marker-id") || "").trim();
        if (!markerId) return null;
        const markerLabel = String(markerEl.getAttribute("data-marker-label") || "").trim() || markerLabelById.get(markerId) || markerId;
        return {
            markerId,
            markerLabel,
        };
    };

    const handlePointerMove = (event) => {
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

    return (
        <article
            className="script-renderer relative"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
        >
            <NodeRenderer node={ast} context={context} />
            {markerTooltip && (
                <div
                    className="fixed z-[80] pointer-events-none rounded-md border border-border/60 bg-popover/95 px-2 py-1 text-xs text-popover-foreground shadow-lg backdrop-blur-sm"
                    style={{
                        left: `${markerTooltip.x + 14}px`,
                        top: `${markerTooltip.y + 14}px`,
                        maxWidth: "280px",
                    }}
                >
                    {markerTooltip.text}
                </div>
            )}
        </article>
    );
});
