
import React, { useMemo } from 'react';

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

// --- Inline Renderer ---
const InlineRenderer = ({ nodes, context }) => {
    if (!nodes) return null;
    return (
        <>
            {nodes.map((node, i) => {
                const key = `${i}-${node.type}`; // Unique-ish key
                
                if (node.type === 'text') return <span key={key}>{node.content}</span>;
                if (node.type === 'direction') return <strong key={key} className="dir-cue text-sm font-semibold">[ {node.content} ]</strong>;
                if (node.type === 'sfx') return <span key={key} className="sfx-cue text-sm text-[var(--script-sfx-color,theme('colors.purple.500'))]">(SFX) {node.content}</span>;
                
                // Dynamic Highlight Rendering
                if (node.type === 'highlight') {
                     // Check for Config Config
                     const config = context.markerConfigs?.find(c => c.id === node.id) || {};
                     const style = { ...config.style };
                     
                     // Legacy checks (if keeping backward compat or mapped configs)
                     // Or if node came from legacy fallback parser without ID?
                     // New parser sets ID. Old parser set type='highlight', kind='brace' etc.
                     // But we replaced parsing logic.
                     // Wait, parsing logic now sets { type: 'highlight', id: config.id }
                     
                     // If we have custom classes or logic:
                     let extraClasses = "";
                     
                     // Handle "distance" logic if config supports keywords
                     // e.g. Config name "Parentheses" with keywords ["V.O.", "O.S."]
                     if (config.keywords && config.keywords.length > 0) {
                         // Check if content matches any keyword
                         const isKeyword = config.keywords.some(k => 
                             node.content.toUpperCase().includes(k.toUpperCase())
                         );
                         if (isKeyword) {
                             // Apply keyword specific style or class?
                             // For now maybe just use the config style.
                             // Traditionally V.O. is orange.
                         } else {
                             // If NOT keyword, maybe dim? 
                             // Parentheses logic: dim unless distance.
                             if (config.dimIfNotKeyword) {
                                 extraClasses = "opacity-60";
                             }
                         }
                     }
                     
                     let displayText = node.content;
                     
                     // 1. Template-based Rendering (New Feature)
                     if (config.renderer && config.renderer.template) {
                         displayText = config.renderer.template.replace('{{content}}', displayText);
                     } 
                     // 2. Legacy/Simple Delimiter Mode
                     else if (config.start && config.end && config.showDelimiters) {
                         displayText = `${config.start}${displayText}${config.end}`;
                     } else if (config.matchMode === 'enclosure') {
                        // Usually we recreate the look: ({content})
                        displayText = `${config.start || ''}${displayText}${config.end || ''}`;
                     }
                     // Actually parser output for 'enclosure' strips delimiters.
                     // It is better to re-add them if we want to show them?
                     // Standard renderer showed: ({content}).
                     
                     // Check if alignment is requested for inline element
                     // If textAlign is present, we must treat it as block-level to affect flow
                     if (style.textAlign) {
                         style.display = 'block';
                         style.width = '100%'; 
                     }

                     return (
                        <span 
                            key={key} 
                            style={style}
                            className={extraClasses}
                        >
                            {displayText}
                        </span>
                     );
                }
                return null;
            })}
        </>
    );
};

// --- Node Renderer ---
const NodeRenderer = ({ node, context }) => {
    const { fontSize, getCharacterColor, filterCharacter, focusMode, focusEffect } = context;

    switch (node.type) {
        case 'root':
            return <>{node.children.map((child, i) => <NodeRenderer key={i} node={child} context={context} />)}</>;
            

        case 'layer':
            const config = context.markerConfigs?.find(c => c.id === node.layerType);
            const style = config?.style || {};
            const borderColor = style.color || undefined;
            const bgColor = style.backgroundColor || undefined;
            const template = config?.renderer?.template;
            
            const formatLabel = (lbl) => {
                if (!lbl) return '';
                if (template) {
                     return template.replace(/\{\{content\}\}/g, lbl);
                }
                return lbl;
            };

            const showEndLabel = config?.showEndLabel !== false; // Default true
            const headerLabel = formatLabel(node.label);
            const footerLabel = formatLabel(node.endLabel || node.label);

            return (
                <div 
                    className={`${node.layerType}-continuous-layer my-2 border-l-4 pl-4 relative`}
                    style={{
                        ...style,
                        borderColor: borderColor ? borderColor : 'var(--muted)', // Fallback if no color
                        backgroundColor: bgColor,
                        // Ensure we don't break layout
                    }}
                >
                     <div className={`${node.layerType}-continuous-label text-xs opacity-70 font-mono mb-1`}>{headerLabel}</div>
                     <div className="layer-content">
                        {node.children.map((child, i) => <NodeRenderer key={i} node={child} context={context} />)}
                     </div>
                     {showEndLabel && (
                        <div className={`${node.layerType}-continuous-footer text-xs opacity-70 font-mono mt-1`}>{footerLabel}</div>
                     )}
                </div>
            );
        
        case 'whitespace':
            const label = whitespaceLabels[node.kind] || '';
            // Matching structure of screenplayDom.js renderWhitespaceBlock but in React
            return (
                <div className={`whitespace-block whitespace-${node.kind}`}>
                    <div className="whitespace-line"></div>
                    <div className={`whitespace-line whitespace-label${label ? '' : ' whitespace-label-empty'}`}>{label}</div>
                    <div className="whitespace-line"></div>
                </div>
            );

        case 'speech':
            // Handle Focus Mode
            let opacity = 1;
            let display = 'block';
            let isTarget = true;
            
            if (focusMode && filterCharacter && filterCharacter !== '__ALL__') {
                const cleanName = node.character.replace(/\s*\(.*\)$/, '').toUpperCase();
                // Exact match might be tricky if filterCharacter is just NAME but script has NAME (V.O.)
                // Usually filterCharacter comes from normalized list.
                // We'll normalize both.
                isTarget = cleanName === filterCharacter;

                if (!isTarget) {
                    if (focusEffect === 'hide') display = 'none';
                    else opacity = 0.3; // Dim
                }
            }
            
            if (display === 'none') return null;
            
            return (
                <div className="speech-block" style={{ opacity }}>
                     {node.children.map((child, i) => <NodeRenderer key={i} node={child} context={context} />)}
                </div>
            );

        case 'character':
             const cleanName = node.text.replace(/\s*\(.*\)$/, '').toUpperCase();
             const color = getCharacterColor(cleanName);
             return (
                 <div className="character mt-4 mb-0 font-bold text-center w-full max-w-[60%] mx-auto"
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
                 <div className="parenthetical -mt-0 mb-0 text-center w-full max-w-[50%] mx-auto text-sm opacity-80">
                     <InlineRenderer nodes={node.inline} context={context} />
                 </div>
             );

        case 'dialogue':
             return (
                 <div className="dialogue my-0 mb-4 w-full max-w-[80%] mx-auto text-center whitespace-pre-wrap leading-relaxed">
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
                    <InlineRenderer nodes={node.inline || [{type:'text', content:node.text}]} />
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
    
    // Create color getter
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
