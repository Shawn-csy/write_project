import React from 'react';

/**
 * 純 Marker 模式：所有 inline 渲染都來自 markerConfigs
 * 移除硬編碼的 direction/sfx 渲染器
 */
const renderHighlight = (node, key, context) => {
    // Check if hidden
    if (context.hiddenMarkerIds?.includes(node.id)) return null;

    const config = context.markerConfigs?.find(c => c.id === node.id) || {};
    const style = { ...config.style };
    
    let displayText = node.content || "";
    let extraClasses = "";
    if (config.keywords && config.keywords.length > 0) {
        const isKeyword = config.keywords.some(k => 
            displayText.toUpperCase().includes(k.toUpperCase())
        );
        if (!isKeyword && config.dimIfNotKeyword) {
            extraClasses = "opacity-60";
        }
    }
    
    displayText = node.content || "";
    
    if (config.renderer && config.renderer.template) {
        displayText = config.renderer.template.replace('{{content}}', displayText);
    } 
    else if (config.start && config.end) {
        if (config.showDelimiters) {
            displayText = `${config.start}${displayText}${config.end}`;
        }
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

// 純 Marker 模式：只保留 text 和 highlight 渲染器
const renderers = {
    text: (node, key) => <span key={key}>{node.content}</span>,
    highlight: renderHighlight
};

export const InlineRenderer = ({ nodes, context }) => {
    if (!nodes) return null;
    return (
        <>
            {nodes.map((node, i) => {
                const key = `${i}-${node.type}`; 
                const renderFn = renderers[node.type];
                // 如果沒有對應的渲染器，顯示為純文字
                if (!renderFn) {
                    return <span key={key}>{node.content || ''}</span>;
                }
                return renderFn(node, key, context);
            })}
        </>
    );
};
