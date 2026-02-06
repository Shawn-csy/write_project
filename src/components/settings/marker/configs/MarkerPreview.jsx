import React, { useMemo } from "react";
import { Eye } from "lucide-react";

/**
 * 即時預覽 Marker 渲染效果
 */
export function MarkerPreview({ config }) {
    // 產生範例文字
    const example = useMemo(() => {
        const sampleContent = config.label || "範例內容";
        
        if (config.matchMode === 'range') {
            return {
                raw: `${config.start || '<start>'} ${sampleContent}`,
                rendered: sampleContent
            };
        }
        
        if (config.matchMode === 'prefix') {
            return {
                raw: `${config.start || '/tag'} ${sampleContent}`,
                rendered: config.renderer?.template 
                    ? config.renderer.template.replace('{{content}}', sampleContent)
                    : sampleContent
            };
        }
        
        if (config.matchMode === 'regex') {
            return {
                raw: config.regex ? `[regex match]` : '[pattern]',
                rendered: sampleContent
            };
        }
        
        // enclosure (default)
        return {
            raw: `${config.start || '('}${sampleContent}${config.end || ')'}`,
            rendered: config.renderer?.template 
                ? config.renderer.template.replace('{{content}}', sampleContent)
                : (config.showDelimiters !== false 
                    ? `${config.start || '('}${sampleContent}${config.end || ')'}`
                    : sampleContent)
        };
    }, [config]);

    // 計算樣式
    const previewStyle = useMemo(() => ({
        color: config.style?.color || 'inherit',
        fontWeight: config.style?.fontWeight || 'normal',
        fontStyle: config.style?.fontStyle || 'normal',
        fontFamily: config.style?.fontFamily || 'inherit',
        fontSize: config.style?.fontSize || 'inherit',
        backgroundColor: config.style?.backgroundColor || 'transparent',
        borderRadius: '2px',
        padding: '0 4px'
    }), [config.style]);

    return (
        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">即時預覽</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 原始文字 */}
                <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground">原始標記</span>
                    <div className="font-mono text-xs bg-background/50 px-2 py-1.5 rounded border border-border/30 truncate">
                        {example.raw}
                    </div>
                </div>
                
                {/* 渲染效果 */}
                <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground">渲染效果</span>
                    <div className="text-sm bg-background/50 px-2 py-1.5 rounded border border-border/30">
                        <span style={previewStyle}>{example.rendered}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
