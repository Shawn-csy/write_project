import React, { useMemo } from "react";

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
    <div className="rounded-lg border border-border/40 bg-background/60 p-3 space-y-2">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">即時預覽</div>
      <div className="text-sm rounded border border-border/30 bg-background px-2 py-1.5">
        <span style={previewStyle}>{example.rendered}</span>
      </div>
      <div className="text-[11px] font-mono text-muted-foreground truncate">
        {example.raw}
      </div>
    </div>
  );
}
