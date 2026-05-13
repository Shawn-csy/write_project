import React, { useMemo } from "react";
import { useI18n } from "../../../../contexts/I18nContext";

/**
 * Live preview for marker rendering output.
 */
export function MarkerPreview({ config }) {
    const { t } = useI18n();
    // Build sample content
    const example = useMemo(() => {
        const sampleContent = config.label || t("markerPreview.sampleContent");
        
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
    }, [config, t]);

    // Compute preview style
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
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t("markerPreview.livePreview")}</div>
      <div className="text-sm rounded border border-border/30 bg-background px-2 py-1.5">
        <span style={previewStyle}>{example.rendered}</span>
      </div>
      <div className="text-[11px] font-mono text-muted-foreground truncate">
        {example.raw}
      </div>
    </div>
  );
}
