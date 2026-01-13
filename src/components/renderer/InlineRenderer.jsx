import React from 'react';

const renderHighlight = (node, key, context) => {
    const config = context.markerConfigs?.find(c => c.id === node.id) || {};
    const style = { ...config.style };
    
    let extraClasses = "";
    if (config.keywords && config.keywords.length > 0) {
        const isKeyword = config.keywords.some(k => 
            node.content.toUpperCase().includes(k.toUpperCase())
        );
        if (!isKeyword && config.dimIfNotKeyword) {
            extraClasses = "opacity-60";
        }
    }
    
    let displayText = node.content;
    
    if (config.renderer && config.renderer.template) {
        displayText = config.renderer.template.replace('{{content}}', displayText);
    } 
    else if (config.start && config.end && config.showDelimiters) {
        displayText = `${config.start}${displayText}${config.end}`;
    } else if (config.matchMode === 'enclosure') {
       displayText = `${config.start || ''}${displayText}${config.end || ''}`;
    }
    
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
};

const renderers = {
    text: (node, key) => <span key={key}>{node.content}</span>,
    direction: (node, key) => <strong key={key} className="dir-cue text-sm font-semibold">[ {node.content} ]</strong>,
    sfx: (node, key) => <span key={key} className="sfx-cue text-sm text-[var(--script-sfx-color,theme('colors.purple.500'))]">(SFX) {node.content}</span>,
    highlight: renderHighlight
};

export const InlineRenderer = ({ nodes, context }) => {
    if (!nodes) return null;
    return (
        <>
            {nodes.map((node, i) => {
                const key = `${i}-${node.type}`; 
                const renderFn = renderers[node.type];
                return renderFn ? renderFn(node, key, context) : null;
            })}
        </>
    );
};
