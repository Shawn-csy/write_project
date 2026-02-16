import React from "react";
import { Copy } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";

export function MarkerGuideCard({ config, onCopy, minimal = false }) {
    // Helper property compatibility
    const isBlock = config.type === 'block' || config.isBlock;
    const displayName = config.label || "未命名標記";

    let syntaxDisplay = "";
    let exampleText = "";

    if (config.matchMode === "prefix") {
        syntaxDisplay = `${config.start} 內容`;
        exampleText = `${config.start} 範例文字`;
    } else if (config.matchMode === "enclosure" || config.matchMode === "range") {
        syntaxDisplay = `${config.start}內容${config.end}`;
        exampleText = `${config.start}範例文字${config.end}`;
    } else if (config.matchMode === "regex") {
        syntaxDisplay = `Regex: ${config.regex}`;
        exampleText = "(符合規則的文字)";
    }

    const handleCopy = (e) => {
        e.stopPropagation();
        onCopy?.(exampleText);
    };

    return (
        <div className={cn(
            "text-xs border border-border/60 rounded-md bg-card p-2 relative group transition-all hover:shadow-sm",
            minimal ? "p-1.5 border-0 bg-transparent shadow-none" : ""
        )}>
             {!minimal && (
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 text-muted-foreground hover:text-foreground"
                        onClick={handleCopy}
                        title="複製範例"
                    >
                        <Copy className="w-3 h-3" />
                    </Button>
                </div>
            )}

            <div className="flex items-center justify-between mb-1.5 pr-6">
              <span className="font-semibold text-xs text-foreground/90 flex items-center gap-1.5">
                {displayName}
                 <span className={cn(
                    "text-[9px] px-1 py-0 rounded-sm border leading-tight font-normal",
                    isBlock 
                        ? "bg-blue-500/5 text-blue-600 border-blue-200/50" 
                        : "bg-green-500/5 text-green-600 border-green-200/50"
                )}>
                    {isBlock ? '段落' : '行內'}
                </span>
              </span>
              <code className="text-[10px] bg-muted/80 px-1 py-0.5 rounded-sm font-mono text-muted-foreground/80">
                {syntaxDisplay}
              </code>
            </div>

            <div className="p-2 rounded-sm bg-background/50 border border-dashed border-border/60 font-serif relative overflow-hidden">
                 {/* Background pattern for clarity? Optional. */}
              {isBlock ? (
                // Block Preview
                <div
                  className="relative my-0.5 border-l-2 pl-2"
                  style={{
                    ...config.style,
                    borderColor: config.style?.color || "var(--muted)",
                    backgroundColor: config.style?.backgroundColor,
                    // Limit height
                    maxHeight: '40px',
                    overflow: 'hidden'
                  }}
                >
                  <div className="text-[10px] opacity-70 font-mono mb-0.5 scale-90 origin-top-left">
                    {config.renderer?.template
                      ? config.renderer.template.replace(
                          /\{\{content\}\}/g,
                          displayName
                        )
                      : displayName}
                  </div>
                  <div className="opacity-90 leading-tight text-[11px]">{displayName} 範例段落...</div>
                </div>
              ) : (
                // Inline Preview
                <div className="leading-tight text-[11px]">
                  這是一個
                  <span
                    style={{
                      ...config.style,
                      display: "inline-block",
                    }}
                    className="mx-1 px-1 rounded-sm"
                  >
                    {config.renderer?.template
                      ? config.renderer.template.replace(
                          /\{\{content\}\}/g,
                          `${displayName}範例`
                        )
                      : `${displayName}範例`}
                  </span>
                  的效果。
                </div>
              )}
            </div>
        </div>
    );
}
