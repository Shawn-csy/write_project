import React from 'react';

export const LayerNode = ({ node, context, NodeRenderer }) => {
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

    const showEndLabel = config?.showEndLabel !== false; 
    const headerLabel = formatLabel(node.label);
    const footerLabel = formatLabel(node.endLabel || node.label);

    return (
        <div 
            className={`${node.layerType}-continuous-layer my-2 border-l-4 pl-4 relative`}
            style={{
                ...style,
                borderColor: borderColor ? borderColor : 'var(--muted)',
                backgroundColor: bgColor,
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
};
