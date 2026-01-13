import React, { useMemo } from 'react';
import { InlineRenderer } from './InlineRenderer';
import { LayerNode } from './nodes/LayerNode';
import { DualDialogueNode } from './nodes/DualDialogueNode';
import { SpeechNode } from './nodes/SpeechNode';

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

// --- Node Renderer ---
const NodeRenderer = ({ node, context, isDual = false }) => {
    const { getCharacterColor } = context;

    switch (node.type) {
        case 'root':
            return <>{node.children.map((child, i) => <NodeRenderer key={i} node={child} context={context} />)}</>;
            
        case 'layer':
            return <LayerNode node={node} context={context} NodeRenderer={NodeRenderer} />;
        
        case 'whitespace':
            const label = whitespaceLabels[node.kind] || '';
            return (
                <div className={`whitespace-block whitespace-${node.kind}`}>
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
             const cleanName = node.text.replace(/\s*\(.*\)$/, '').toUpperCase();
             const color = getCharacterColor(cleanName);
             return (
                 <div className={`character mt-4 mb-0 font-bold text-center w-full mx-auto ${isDual ? 'max-w-full' : 'max-w-[60%]'}`}
                      style={{ color, '--char-color': color }}
                 >
                     {node.text}
                 </div>
             );

        case 'scene_heading':
            return (
                <h3 id={node.id || node.scene_number || node.text} className="scene-heading font-bold mt-6 mb-2 text-lg uppercase pl-4 border-l-4 border-primary/50">
                    {node.text}
                </h3>
            );

        case 'action':
             return (
                 <p className="action my-2 whitespace-pre-wrap leading-relaxed">
                     <InlineRenderer nodes={node.inline} context={context} />
                 </p>
             );

        case 'parenthetical':
             return (
                 <div className={`parenthetical -mt-0 mb-0 text-center w-full mx-auto text-sm opacity-80 ${isDual ? 'max-w-full' : 'max-w-[50%]'}`}>
                     <InlineRenderer nodes={node.inline} context={context} />
                 </div>
             );

        case 'dialogue':
             return (
                 <div className={`dialogue my-0 mb-4 w-full mx-auto text-center whitespace-pre-wrap leading-relaxed ${isDual ? 'max-w-full' : 'max-w-[80%]'}`}>
                     <InlineRenderer nodes={node.inline} context={context} />
                 </div>
             );
        
        case 'transition':
             return (
                 <div className="transition text-right font-bold uppercase my-4">
                     {node.text}
                 </div>
             );

        case 'centered':
             return (
                 <div className="centered text-center my-4 uppercase">
                    <InlineRenderer nodes={node.inline || [{type:'text', content:node.text}]} context={context} />
                 </div>
             );

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
    themePalette, 
    colorCache,
    markerConfigs = [],
}) => {
    
    const getCharacterColor = useMemo(() => {
        return makeCharacterColorGetter(themePalette, colorCache);
    }, [themePalette, colorCache]);

    const context = {
        fontSize,
        filterCharacter,
        focusMode,
        focusEffect,
        getCharacterColor,
        markerConfigs
    };

    return (
        <div className="script-renderer font-serif" style={{ fontSize: `${fontSize}px`, '--body-font-size': `${fontSize}px` }}>
            <NodeRenderer node={ast} context={context} />
        </div>
    );
});
