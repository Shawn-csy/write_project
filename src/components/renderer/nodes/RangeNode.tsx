import React from 'react';
import { LayerNode } from './LayerNode';

interface RangeNodeData {
    rangeGroupId?: string;
    style?: Record<string, string>;
    children?: Array<Record<string, unknown>>;
    startNode?: Record<string, unknown> | null;
    endNode?: Record<string, unknown> | null;
}

interface RangeNodeContext {
    hiddenMarkerIds?: string[];
    markerConfigs?: Array<{ id?: string; label?: string }>;
    markerTooltipPrefix?: string | null;
}

interface RangeNodeProps {
    node: RangeNodeData;
    context: RangeNodeContext;
    NodeRenderer: React.ComponentType<{ node: unknown; context: RangeNodeContext }>;
}

export const RangeNode = ({ node, context, NodeRenderer }: RangeNodeProps) => {
    // 檢查是否隱藏：如果隱藏了，只渲染內容子節點，不渲染外框和標頭/標尾
    if (node.rangeGroupId && context.hiddenMarkerIds?.includes(node.rangeGroupId)) {
        return (
            <>
                {(node.children || []).map((child, i) => (
                    <NodeRenderer key={i} node={child} context={context} />
                ))}
            </>
        );
    }

    const style = node.style || {};

    // 分離文字樣式與容器樣式，避免內容繼承 Header 的文字屬性（如顏色、字重）
    const { 
        color, fontWeight, fontStyle, textDecoration, fontSize, lineHeight,
        ...containerOnlyStyle
    } = style;

    // 連接線樣式：優先使用 borderLeft，若無則使用 color 當作邊框色
    const borderColor = style.borderLeft ? undefined : (color || 'var(--muted)');
    
    // 準備給 LayerNode 的樣式覆蓋
    const layerStyleOverride = {
        // 將分離出的文字樣式應用回去給 Header/Footer
        color, fontWeight, fontStyle, textDecoration, fontSize, lineHeight,
        
        borderLeft: 'none',
        paddingLeft: '0',
        backgroundColor: 'transparent',
        marginBottom: '0',
        marginTop: '0',
        hideFooter: true
    };

    const connectorBorder = containerOnlyStyle.borderLeft || `2px solid ${borderColor}`;
    const connectorPaddingLeft = containerOnlyStyle.paddingLeft || '8px';
    const connectorMarginLeft = '4px';
    const isPauseNode = (candidate: Record<string, unknown> | undefined) => candidate?.type === 'layer' && candidate?.rangeRole === 'pause';
    const renderWithPauseMask = (contentNode: React.ReactNode, isPause = false, key?: React.Key) => {
        if (!isPause) return contentNode;
        return (
            <div key={key} className="range-pause-mask-row" data-range-pause-mask="true">
                {contentNode}
            </div>
        );
    };
    const renderPauseAsAction = (pauseNode: Record<string, unknown>, key?: React.Key) => {
        const text = String(pauseNode?.text || "").trim();
        if (!text) return null;
        const markerConfig = context?.markerConfigs?.find?.((cfg) => cfg?.id === String(pauseNode?.layerType || ""));
        const markerName = String(markerConfig?.label || String(pauseNode?.layerType || "") || "").trim();
        const tooltipPrefix = context?.markerTooltipPrefix;
        const pauseTooltip = tooltipPrefix === null
            ? undefined
            : markerName
                ? `${tooltipPrefix ?? "標記"}: ${markerName}暫停`
                : `${tooltipPrefix ?? "標記"}: 暫停`;
        const actionLikeNode = {
            type: "action",
            text,
            lineStart: pauseNode?.lineStart as number | undefined,
            lineEnd: (pauseNode?.lineEnd as number | undefined) ?? (pauseNode?.lineStart as number | undefined),
            raw: pauseNode?.raw || text,
            markerId: String(pauseNode?.layerType || ""),
            markerLabel: markerName ? `${markerName}暫停` : "暫停",
        };
        return (
            <div
                key={key}
                className="range-pause-inline-row"
                title={pauseTooltip}
            >
                <NodeRenderer node={actionLikeNode} context={context} />
            </div>
        );
    };

    return (
        <div
            className={`range-node ${node.rangeGroupId}-range my-2 relative`}
            style={{
                // 只保留結構用樣式，避免整段內容被 marker 容器樣式覆蓋。
                borderLeft: connectorBorder,
                paddingLeft: connectorPaddingLeft,
                marginLeft: connectorMarginLeft,
            }}
        >
            {/* 開始標記 */}
            {node.startNode && (() => {
                // 如果是 pause 節點且 label 為空，不顯示
                const isPauseStart = node.startNode.rangeRole === 'pause';
                const hasPauseText = String(node.startNode.text || "").trim() !== '';
                if (isPauseStart && !hasPauseText) return null;
                
                return renderWithPauseMask(
                    isPauseStart ? (
                        <div className="range-header" key="range-header-pause">
                            {renderPauseAsAction(node.startNode, "pause-start")}
                        </div>
                    ) : (
                        <div className="range-header" key="range-header">
                            <LayerNode 
                                node={{ ...node.startNode, children: Array.isArray(node.startNode.children) ? node.startNode.children : [] }} 
                                context={context} 
                                NodeRenderer={NodeRenderer}
                                styleOverride={layerStyleOverride}
                            />
                        </div>
                    ),
                    isPauseStart
                );
            })()}

            {/* 內容 */}
            <div className="range-content">
                {(node.children || []).map((child, i) => {
                    const isPause = isPauseNode(child);
                    const rowContent = isPause
                        ? renderPauseAsAction(child, `pause-${i}`)
                        : <NodeRenderer key={i} node={child} context={context} />;
                    if (!rowContent) return null;
                    return renderWithPauseMask(rowContent, isPause, i);
                })}
            </div>

            {/* 結束標記 */}
            {node.endNode && (() => {
                // 如果是 pause 節點且 label 為空，不顯示
                const isPauseEnd = node.endNode.rangeRole === 'pause';
                const hasPauseText = String(node.endNode.text || "").trim() !== '';
                if (isPauseEnd && !hasPauseText) return null;
                
                return renderWithPauseMask(
                    isPauseEnd ? (
                        <div className="range-footer" key="range-footer-pause">
                            {renderPauseAsAction(node.endNode, "pause-end")}
                        </div>
                    ) : (
                        <div className="range-footer" key="range-footer">
                            <LayerNode 
                                node={{ ...node.endNode, children: Array.isArray(node.endNode.children) ? node.endNode.children : [] }} 
                                context={context} 
                                NodeRenderer={NodeRenderer} 
                                styleOverride={layerStyleOverride}
                            />
                        </div>
                    ),
                    isPauseEnd
                );
            })()}
            
            {/* 連接線視覺修正：確保線條連續 */}
            {/* 如果 style 是 borderLeft 類型，div 本身的 border 已經足夠 */}
        </div>
    );
};
