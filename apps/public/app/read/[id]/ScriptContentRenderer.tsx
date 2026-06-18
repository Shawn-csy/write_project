"use client";

import type { AstNode, MarkerConfig } from "@write/script-engine";
import { ScriptPresentationRenderer } from "@write/script-reader-renderer";

interface ScriptContentRendererProps {
  ast: AstNode;
  markerConfigs: MarkerConfig[];
  hiddenMarkerIds?: string[];
  fontSize?: number;
  lineHeight?: number;
  readingFontFamily?: string;
  className?: string;
}

export function ScriptContentRenderer({
  ast,
  markerConfigs,
  hiddenMarkerIds = [],
  fontSize,
  lineHeight,
  readingFontFamily,
  className,
}: ScriptContentRendererProps) {
  return (
    <article className={`script-renderer presentation-script-renderer${className ? ` ${className}` : ""}`}>
      <ScriptPresentationRenderer
        ast={ast}
        markerConfigs={markerConfigs}
        hiddenMarkerIds={hiddenMarkerIds}
        fontSize={fontSize}
        lineHeight={lineHeight}
        readingFontFamily={readingFontFamily}
        mode="auto"
      />
    </article>
  );
}
