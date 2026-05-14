import React from 'react';
import { InlineRenderer } from '../InlineRenderer';
import type { InlineNodeLike, MarkerConfigLike } from '../../../types/renderer';

interface LayerNodeData {
    layerType?: string;
    rangeRole?: string;
    lineStart?: number;
    endLine?: number;
    inlineLabel?: InlineNodeLike[];
    inlineEndLabel?: InlineNodeLike[];
    label?: string;
    text?: string;
    endLabel?: string;
    children?: unknown[];
}

interface LayerNodeContext {
    hiddenMarkerIds?: string[];
    markerConfigs?: MarkerConfigLike[];
    markerTooltipPrefix?: string;
}

interface LayerNodeProps {
    node: LayerNodeData;
    context: LayerNodeContext;
    NodeRenderer: React.ComponentType<{ node: unknown; context: LayerNodeContext }>;
    styleOverride?: { hideFooter?: boolean; [key: string]: string | boolean | undefined };
}

export const LayerNode = ({ node, context, NodeRenderer, styleOverride }: LayerNodeProps) => {
    // Check if hidden
    if (node.layerType && context.hiddenMarkerIds?.includes(node.layerType)) return null;

    const config = context.markerConfigs?.find((c) => c.id === node.layerType);
    const mergedRawStyle = { ...(config?.style || {}), ...(styleOverride || {}) };
    const style: Record<string, string> = {};
    for (const [k, v] of Object.entries(mergedRawStyle)) {
        if (typeof v === "string") style[k] = v;
    }
    const borderColor = style.color || undefined;
    const bgColor = style.backgroundColor || undefined;
    const template = config?.renderer?.template;
    const markerName = String(config?.label || node.layerType || "").trim();
    const tooltip = markerName
        ? `${context.markerTooltipPrefix || "標記"}: ${markerName}`
        : undefined;

    const lineProps = (lineValue?: number) => {
        if (!lineValue) return {};
        return {
            "data-line-start": lineValue,
            "data-line-end": lineValue
        };
    };
    
    const isRangeControlLine = Boolean(node.rangeRole);

    // If template exists, we need to inject the inline nodes into the template
    const renderLabelContent = (inlineNodes: InlineNodeLike[] | undefined, rawLabel?: string, fallbackText = "") => {
        if (!inlineNodes || inlineNodes.length === 0) {
            return fallbackText || rawLabel;
        }
        
        // If no template, just render nodes
        if (!template) {
            return <InlineRenderer nodes={inlineNodes} context={context} />;
        }

        // If template exists, we need to split it
        const parts = template.split('{{content}}');
        if (parts.length === 1) return parts[0]; // Should not happen if {{content}} is there

        return (
            <>
                {parts[0]}
                <InlineRenderer nodes={inlineNodes || []} context={context} />
                {parts[1]}
            </>
        );
    };

    const showEndLabel = styleOverride?.hideFooter !== true && !isRangeControlLine && config?.showEndLabel !== false; 
    const isSingleLineBlock = (!node.children || node.children.length === 0) && !node.rangeRole;
    const labelClass = isSingleLineBlock
        ? `${node.layerType}-single-block-content layer-label mb-1`
        : `${node.layerType}-continuous-label layer-label text-xs opacity-70 font-mono mb-1`;

    return (
        <div 
            className={`${node.layerType}-continuous-layer layer-node my-2 border-l-4 pl-4 relative`}
            style={{
                ...style,
                borderColor: borderColor ? borderColor : 'var(--muted)',
                backgroundColor: bgColor,
            }}
            title={tooltip}
            data-marker-id={node.layerType || ""}
            data-marker-label={markerName}
        >
             <div className={labelClass}>
                <span {...lineProps(node.lineStart)}>
                    {renderLabelContent(
                        node.inlineLabel,
                        node.label,
                        isRangeControlLine ? (node.text || "") : ""
                    )}
                </span>
             </div>
             <div className="layer-content">
                {(node.children || []).map((child, i) => <NodeRenderer key={i} node={child} context={context} />)}
             </div>
             {showEndLabel && (
                <div className={`${node.layerType}-continuous-footer layer-footer text-xs opacity-70 font-mono mt-1`}>
                    <span {...lineProps(node.endLine)}>
                        {renderLabelContent(node.inlineEndLabel, node.endLabel || node.label)}
                    </span>
                </div>
             )}
        </div>
    );
};
