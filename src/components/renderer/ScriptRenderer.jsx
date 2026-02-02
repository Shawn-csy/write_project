import React, { useMemo } from 'react';
import { InlineRenderer } from './InlineRenderer';
import { LayerNode } from './nodes/LayerNode';
import { DualDialogueNode } from './nodes/DualDialogueNode';
import { SpeechNode } from './nodes/SpeechNode';
import { parseInline } from '../../lib/parsers/inlineParser.js';

const makeCharacterColorGetter = (themePalette, cacheRef) => (name) => {
  if (!name) return "hsl(0 0% 50%)";
  const key = name.toUpperCase();
  if (cacheRef?.current?.has(key)) return cacheRef.current.get(key);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % (themePalette?.length || 1);
  const color = themePalette?.[colorIndex] || "160 84% 39%";
  cacheRef?.current?.set?.(key, color);
  return color;
};

const whitespaceLabels = {
  short: "停頓一秒",
  mid: "停頓三秒",
  long: "停頓五秒",
  pure: "",
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
        const inlineNodes = parseInline(line, context.markerConfigs || []);
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

// --- Node Renderer ---
const NodeRenderer = ({ node, context, isDual = false }) => {
    const { getCharacterColor, focusMode, focusEffect } = context;

    // Helper for applying focus effect to non-dialogue nodes
    const getFocusStyle = () => {
        if (!focusMode) return {};
        if (focusEffect === 'hide') return { display: 'none' };
        return { opacity: 0.3, transition: 'opacity 0.3s' };
    };

    switch (node.type) {
        case 'root':
            return <>{node.children.map((child, i) => <NodeRenderer key={i} node={child} context={context} />)}</>;
            
        case 'layer':
            return <LayerNode node={node} context={context} NodeRenderer={NodeRenderer} />;
        
        case 'whitespace':
            const label = whitespaceLabels[node.kind] || '';
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
             // Should not happen directly usually, but if so:
             const cleanName = node.text.replace(/\s*\(.*\)$/, '').toUpperCase();
             const color = getCharacterColor(cleanName);
            return (
                <div className={`character mt-4 mb-0 font-bold text-left w-full ${isDual ? 'max-w-full' : ''}`}
                     style={{ color, '--char-color': color }}
                     {...getLineProps(node)}
                 >
                     {node.text}
                 </div>
            );

        case 'scene_heading':
            const sceneStyle = getFocusStyle();
            if (sceneStyle.display === 'none') return null;

            return (
                <h3 id={node.id || node.scene_number || node.text} 
                    className="scene-heading font-bold mt-6 mb-2 text-lg uppercase pl-4 border-l-4 border-primary/50 transition-opacity"
                    style={sceneStyle}
                    {...getLineProps(node)}
                >
                    {node.text}
                </h3>
            );

        case 'action':
             const actionStyle = getFocusStyle();
             if (actionStyle.display === 'none') return null;

            return (
                <div className="action whitespace-pre-wrap transition-opacity" style={actionStyle}>
                     {renderInlineLines(node, context)}
                </div>
            );

        case 'parenthetical':
             // usually inside speech, handled by SpeechNode. If loose, apply style.
            return (
                <div className={`parenthetical text-left w-full text-sm opacity-80 ${isDual ? 'max-w-full' : ''}`}>
                     {renderInlineLines(node, context)}
                </div>
            );

        case 'dialogue':
             // usually inside speech
            return (
                <div className={`dialogue text-left whitespace-pre-wrap ${isDual ? 'max-w-full' : ''}`}>
                     {renderInlineLines(node, context)}
                </div>
            );
        
        case 'transition':
             const transStyle = getFocusStyle();
             if (transStyle.display === 'none') return null;

            return (
                <div className="transition text-right font-bold uppercase my-4 transition-opacity" style={transStyle}>
                     {renderInlineLines(node, context)}
                </div>
            );

        case 'centered':
             const centerStyle = getFocusStyle();
             if (centerStyle.display === 'none') return null;

            return (
                <div className="centered text-center my-4 uppercase transition-opacity" style={centerStyle}>
                    {renderInlineLines(node, context)}
                </div>
            );

        case 'blank':
             // 純 Marker 模式的空行
             return <div className="blank-line my-1" {...getLineProps(node)} />;

        case 'note':
             return null;

        default:
             if (node.text) return <p className="unknown text-muted-foreground">{node.text}</p>;
             return null;
    }
};

export const ScriptRenderer = React.memo(({ 
    ast, 
    fontSize = 16, 
    filterCharacter, 
    focusMode, 
    focusEffect, 
    focusContentMode,
    themePalette, 
    colorCache,
    markerConfigs = [],
    hiddenMarkerIds = [],
}) => {
    
    const getCharacterColor = useMemo(() => {
        return makeCharacterColorGetter(themePalette, colorCache);
    }, [themePalette, colorCache]);

    const context = {
        fontSize,
        filterCharacter,
        focusMode,
        focusEffect,
        focusContentMode,
        getCharacterColor,
        markerConfigs: Array.isArray(markerConfigs) ? markerConfigs : [],
        hiddenMarkerIds // Add to context
    };

    return (
        <div className="script-renderer font-serif" style={{ fontSize: `${fontSize}px`, '--body-font-size': `${fontSize}px` }}>
            <NodeRenderer node={ast} context={context} />
        </div>
    );
});
