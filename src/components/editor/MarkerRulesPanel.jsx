import React from "react";
import { Settings } from "lucide-react";

export function MarkerRulesPanel({
  show,
  onClose,
  markerConfigs,
  readOnly,
  onOpenMarkerSettings
}) {
  if (!show) return null;

  return (
    <div className="absolute top-12 right-4 w-80 max-h-[80%] overflow-y-auto bg-popover border border-border rounded-lg shadow-xl z-50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          標記規則速查
          {!readOnly && onOpenMarkerSettings && (
            <button
              onClick={onOpenMarkerSettings}
              className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-colors"
              title="前往自訂標記設定"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
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
              預覽效果：
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
                  <div className="opacity-90">範例段落內容...</div>
                </div>
              ) : (
                // Inline Preview
                <div>
                  這是一個
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
                          "範例標記"
                        )
                      : "範例標記"}
                  </span>
                  的效果。
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
