import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";

export function PublicMarkerLegend({ markerConfigs, className }) {
  if (!markerConfigs || markerConfigs.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2", className)}>
      {markerConfigs.map((config) => {
        // Determine preview text based on type
        const isBlock = config.type === 'block' || config.isBlock;
        const previewText = "預覽效果"; // Simple text for the legend

        // Style for the preview side
        // forced inline-block for better alignment in the legend
        const previewStyle = {
            ...config.style,
            display: 'inline-block',
            margin: 0,
            maxWidth: '100%',
        };

        return (
          <div key={config.id} className="group flex items-center gap-3 text-sm py-2 border-b border-dashed border-border/40 last:border-0 hover:bg-muted/30 transition-colors px-2 rounded-md">
            {/* Label Side */}
            <span className="font-medium text-foreground/80 shrink-0 min-w-[5rem] text-right">
                {config.label || config.id}
            </span>

            {/* Arrow Divider */}
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />

            {/* Preview Side */}
            <div className="flex-1 min-w-0 truncate">
                 {isBlock ? (
                     <div 
                        className="text-xs px-2 py-0.5 border-l-2 truncate"
                        style={{
                            ...config.style,
                            borderColor: config.style?.color || "currentColor",
                            borderWidth: '0 0 0 2px', // Force left border only
                            backgroundColor: config.style?.backgroundColor || 'transparent',
                            // Reset margins that might break layout
                            margin: 0
                        }}
                     >
                        {previewText.replace("預覽效果", `${config.label || config.id}`)}
                     </div>
                 ) : (
                    <span 
                        className="px-1.5 py-0.5 rounded-sm truncate inline-block align-middle"
                        style={previewStyle}
                    >
                        {previewText.replace("預覽效果", `${config.label || config.id}`)}
                    </span>
                 )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
