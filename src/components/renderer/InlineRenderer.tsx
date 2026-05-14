import React from 'react';
import type { InlineNodeLike, MarkerConfigLike } from '../../types/renderer';

interface InlineRenderContext {
    hiddenMarkerIds?: string[];
    markerConfigs?: MarkerConfigLike[];
    markerTooltipPrefix?: string;
}

interface InlineRendererProps {
    nodes: unknown[] | null | undefined;
    context: InlineRenderContext;
}

/**
 * 純 Marker 模式：所有 inline 渲染都來自 markerConfigs
 * 移除硬編碼的 direction/sfx 渲染器
 */
const renderHighlight = (node: InlineNodeLike, key: string, context: InlineRenderContext) => {
    // Check if hidden
    if (node.id && context.hiddenMarkerIds?.includes(node.id)) return null;

    const config = context.markerConfigs?.find((c) => c.id === node.id) || {};
    const style = { ...(config.style || {}) };
    
    let displayText = node.content || "";
    let extraClasses = "";
    if (config.keywords && config.keywords.length > 0) {
        const isKeyword = config.keywords.some((k) =>
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
    const markerName = String(config.label || node.id || "").trim();
    const tooltip = markerName
        ? `${context.markerTooltipPrefix || "標記"}: ${markerName}`
        : undefined;

    return (
       <span 
           key={key} 
           style={style}
           className={extraClasses}
           title={tooltip}
           data-marker-id={node.id || ""}
           data-marker-label={markerName}
       >
           {displayText}
       </span>
    );
};

// 純 Marker 模式：只保留 text 和 highlight 渲染器
const renderers = {
    text: (node: InlineNodeLike, key: string) => <span key={key}>{node.content}</span>,
    highlight: renderHighlight
};

export const InlineRenderer = React.memo(function InlineRenderer({ nodes, context }: InlineRendererProps) {
    if (!nodes) return null;
    return (
        <>
            {nodes.map((node, i) => {
                const safeNode = (node && typeof node === "object") ? node as InlineNodeLike : { type: "text", content: String(node ?? "") };
                const key = `${i}-${safeNode.type}`; 
                const renderFn = renderers[safeNode.type as keyof typeof renderers];
                // 如果沒有對應的渲染器，顯示為純文字
                if (!renderFn) {
                    return <span key={key}>{safeNode.content || ''}</span>;
                }
                return renderFn(safeNode, key, context);
            })}
        </>
    );
});
