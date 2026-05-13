import React from "react";
import { Settings } from "lucide-react";
import { useI18n } from "../../contexts/I18nContext";

export function MarkerRulesPanel({
  show,
  onClose,
  markerConfigs,
  readOnly,
  onOpenMarkerSettings
}) {
  const { t } = useI18n();
  if (!show) return null;

  return (
    <div className="absolute top-14 right-4 w-96 max-h-[80%] overflow-y-auto bg-popover border border-border rounded-lg shadow-xl z-50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {t("markerRules.title")}
          {!readOnly && onOpenMarkerSettings && (
            <button
              onClick={onOpenMarkerSettings}
              className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-colors"
              title={t("markerRules.goSettings")}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="close"
        >
          ✕
        </button>
      </div>
      <div className="space-y-4">
        {markerConfigs.map((config) => (
          <div
            key={config.id}
            className="text-sm border-b pb-3 last:border-0 last:pb-0"
          >
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-semibold text-xs text-muted-foreground">
                {config.label || config.id}
              </span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {config.start}text{config.end}
              </code>
            </div>

            {/* Live Preview Render */}
            <div className="mt-2 text-xs text-muted-foreground mb-1">
              {t("markerRules.preview")}
            </div>
            <div className="p-3 rounded bg-background border border-dashed border-muted-foreground/20 font-serif">
              {config.isBlock ? (
                // Block Preview (Simulating LayerNode)
                <div
                  className="relative my-1 border-l-4 pl-4"
                  style={{
                    ...config.style,
                    borderColor: config.style?.color || "var(--muted)",
                    backgroundColor: config.style?.backgroundColor,
                  }}
                >
                  <div className="text-xs opacity-70 font-mono mb-1">
                    {config.renderer?.template
                      ? config.renderer.template.replace(
                          /\{\{content\}\}/g,
                          config.label || config.id
                        )
                      : config.label || config.id}
                  </div>
                  <div className="opacity-90">{t("markerRules.sampleParagraph")}</div>
                </div>
              ) : (
                // Inline Preview
                <div>
                  {t("markerRules.inlinePrefix")}
                  <span
                    style={{
                      ...config.style,
                      display: "inline-block", // Force inline-block for transform/padding etc
                    }}
                    className="mx-1 px-1 rounded"
                  >
                    {config.renderer?.template
                      ? config.renderer.template.replace(
                          /\{\{content\}\}/g,
                          t("markerRules.sampleTag")
                        )
                      : t("markerRules.sampleTag")}
                  </span>
                  {t("markerRules.inlineSuffix")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
