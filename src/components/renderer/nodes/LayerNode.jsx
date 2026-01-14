import React from 'react';
import { InlineRenderer } from '../InlineRenderer';

export const LayerNode = ({ node, context, NodeRenderer }) => {
    const config = context.markerConfigs?.find(c => c.id === node.layerType);
    const style = config?.style || {};
    const borderColor = style.color || undefined;
    const bgColor = style.backgroundColor || undefined;
    const template = config?.renderer?.template;
    
    // If template exists, we need to inject the inline nodes into the template
    const renderLabelContent = (inlineNodes, rawLabel) => {
        if (!inlineNodes || inlineNodes.length === 0) return rawLabel;
        
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
                <InlineRenderer nodes={inlineNodes} context={context} />
                {parts[1]}
            </>
        );
    };

    const showEndLabel = config?.showEndLabel !== false; 
    
    return (
        <div 
            className={`${node.layerType}-continuous-layer my-2 border-l-4 pl-4 relative`}
            style={{
                ...style,
                borderColor: borderColor ? borderColor : 'var(--muted)',
                backgroundColor: bgColor,
            }}
        >
             <div className={`${node.layerType}-continuous-label text-xs opacity-70 font-mono mb-1`}>
                {renderLabelContent(node.inlineLabel, node.label)}
             </div>
             <div className="layer-content">
                {node.children.map((child, i) => <NodeRenderer key={i} node={child} context={context} />)}
             </div>
             {showEndLabel && (
                <div className={`${node.layerType}-continuous-footer text-xs opacity-70 font-mono mt-1`}>
                    {renderLabelContent(node.inlineEndLabel, node.endLabel || node.label)}
                </div>
             )}
        </div>
    );
};
