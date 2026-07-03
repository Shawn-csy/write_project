import React, { useMemo } from "react";
import { useI18n } from "../../../../contexts/I18nContext";
import type { EditableMarkerConfig } from "../types";

/**
 * Live preview for marker rendering output.
 */
interface MarkerPreviewProps {
    config: EditableMarkerConfig;
    compact?: boolean;
    expanded?: boolean;
}

export function MarkerPreview({ config, compact = false, expanded = false }: MarkerPreviewProps): React.JSX.Element {
    const { t } = useI18n();
    // Build sample content
    const example = useMemo<{ raw: string; rendered: string }>(() => {
        const sampleContent = String(config.label || t("markerPreview.sampleContent"));
        const template = typeof config.renderer?.template === "string" ? config.renderer.template : "";

        if (config.matchMode === 'range') {
            return {
                raw: `${config.start || '<start>'} ${sampleContent}`,
                rendered: sampleContent
            };
        }

        if (config.matchMode === 'prefix') {
            return {
                raw: `${config.start || '/tag'} ${sampleContent}`,
                rendered: template
                    ? template.replace('{{content}}', sampleContent)
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
            rendered: template
                ? template.replace('{{content}}', sampleContent)
                : (config.showDelimiters !== false
                    ? `${config.start || '('}${sampleContent}${config.end || ')'}`
                    : sampleContent)
        };
    }, [config, t]);

    // Compute preview style
    const previewStyle = useMemo(() => ({
        color: String(config.style?.color || 'inherit'),
        fontWeight: String(config.style?.fontWeight || 'normal'),
        fontStyle: String(config.style?.fontStyle || 'normal'),
        fontFamily: String(config.style?.fontFamily || 'inherit'),
        fontSize: String(config.style?.fontSize || 'inherit'),
        backgroundColor: String(config.style?.backgroundColor || 'transparent'),
        borderRadius: '2px',
        padding: '0 4px'
    }), [config.style]);

    if (compact) {
        return (
            <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] text-muted-foreground/70 shrink-0">{t("markerPreview.livePreview")}</span>
                <span className="rounded border border-border/30 bg-background/60 px-2 py-0.5 text-sm font-mono truncate">
                    <span style={previewStyle}>{example.rendered}</span>
                </span>
            </div>
        );
    }

    if (expanded) {
        return (
            <div className="space-y-2">
                <div className="text-[11px] font-mono text-muted-foreground/60 truncate">{example.raw}</div>
                {/* Light bg */}
                <div className="rounded-md border border-border/30 bg-white px-3 py-2 text-sm leading-relaxed">
                    <span className="text-gray-300 select-none">… </span>
                    <span style={previewStyle}>{example.rendered}</span>
                    <span className="text-gray-300 select-none"> …</span>
                </div>
                {/* Dark bg */}
                <div className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm leading-relaxed">
                    <span className="text-zinc-700 select-none">… </span>
                    <span style={previewStyle}>{example.rendered}</span>
                    <span className="text-zinc-700 select-none"> …</span>
                </div>
            </div>
        );
    }

  return (
    <div className="rounded-lg border border-border/40 bg-background/60 p-4 space-y-2">
      <div className="text-sm font-medium text-muted-foreground">{t("markerPreview.livePreview")}</div>
      <div className="text-base rounded border border-border/30 bg-background px-3 py-2">
        <span style={previewStyle}>{example.rendered}</span>
      </div>
      <div className="text-sm font-mono text-muted-foreground truncate">
        {example.raw}
      </div>
    </div>
  );
}
