import React from 'react';
import { LayerNode } from './LayerNode';

export const RangeNode = ({ node, context, NodeRenderer }) => {
    // 檢查是否隱藏：如果隱藏了，只渲染內容子節點，不渲染外框和標頭/標尾
    if (context.hiddenMarkerIds?.includes(node.rangeGroupId)) {
        return (
            <>
                {node.children.map((child, i) => (
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

    return (
        <div
            className={`range-node ${node.rangeGroupId}-range my-2 relative`}
            style={{
                // 只保留結構用樣式，避免整段內容被 marker 容器樣式覆蓋。
                borderLeft: containerOnlyStyle.borderLeft || `2px solid ${borderColor}`,
                paddingLeft: containerOnlyStyle.paddingLeft || '8px',
                marginLeft: '4px'
            }}
        >
            {/* 開始標記 */}
            {node.startNode && (() => {
                // 如果是 pause 節點且 label 為空，不顯示
                const isPauseStart = node.startNode.rangeRole === 'pause';
                const hasPauseText = node.startNode.text && node.startNode.text.trim() !== '';
                if (isPauseStart && !hasPauseText) return null;
                
                return (
                    <div className="range-header">
                        <LayerNode 
                            node={node.startNode} 
                            context={context} 
                            NodeRenderer={NodeRenderer}
                            styleOverride={layerStyleOverride}
                        />
                    </div>
                );
            })()}

            {/* 內容 */}
            <div className="range-content">
                {node.children.map((child, i) => (
                    <NodeRenderer key={i} node={child} context={context} />
                ))}
            </div>

            {/* 結束標記 */}
            {node.endNode && (() => {
                // 如果是 pause 節點且 label 為空，不顯示
                const isPauseEnd = node.endNode.rangeRole === 'pause';
                const hasPauseText = node.endNode.text && node.endNode.text.trim() !== '';
                if (isPauseEnd && !hasPauseText) return null;
                
                return (
                    <div className="range-footer">
                        <LayerNode 
                            node={node.endNode} 
                            context={context} 
                            NodeRenderer={NodeRenderer} 
                            styleOverride={layerStyleOverride}
                        />
                    </div>
                );
            })()}
            
            {/* 連接線視覺修正：確保線條連續 */}
            {/* 如果 style 是 borderLeft 類型，div 本身的 border 已經足夠 */}
        </div>
    );
};
