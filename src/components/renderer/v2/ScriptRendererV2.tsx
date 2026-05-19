import React, { useMemo } from 'react';
import {
  buildScriptDocumentV2FromAst,
  applyMarkerSemanticRoutes,
  cloneDefaultLayoutConfig,
  normalizeLayoutConfig,
  orchestrateDocument,
  type LayoutConfig,
  type OrchestratedDocument,
  type ScriptDocumentV2,
} from '../../../lib/v2';
import type { MarkerConfig } from '../../../types/script';
import { resolveReadingFontStack } from '../../../constants/readingFonts';
import { ColumnsRendererV2 } from './ColumnsRendererV2';
import { TimelineRendererV2 } from './TimelineRendererV2';

interface ScriptRendererV2Props {
  document?: ScriptDocumentV2;
  ast?: { children?: Array<Record<string, unknown>> } | null;
  layoutConfig?: LayoutConfig;
  markerConfigs?: MarkerConfig[];
  fontSize?: number;
  lineHeight?: number;
  readingFontFamily?: string;
  hiddenMarkerIds?: string[];
  markerTooltipPrefix?: string;
  mode?: 'auto' | 'columns' | 'timeline';
}

export const ScriptRendererV2 = ({
  document,
  ast,
  layoutConfig,
  markerConfigs = [],
  fontSize = 14,
  lineHeight = 1.4,
  readingFontFamily = 'serif',
  hiddenMarkerIds = [],
  markerTooltipPrefix = '標記',
  mode = 'auto',
}: ScriptRendererV2Props): React.JSX.Element => {
  const readingFontStack = resolveReadingFontStack(readingFontFamily);
  const effectiveDoc = useMemo(() => {
    if (document) return document;
    const effectiveLayoutConfig = applyMarkerSemanticRoutes(
      normalizeLayoutConfig(layoutConfig || cloneDefaultLayoutConfig()),
      markerConfigs
    );
    return buildScriptDocumentV2FromAst(ast, {
      layoutConfig: effectiveLayoutConfig,
      markerConfigs,
    });
  }, [document, ast, layoutConfig, markerConfigs]);

  const orchestrated: OrchestratedDocument = useMemo(
    () => orchestrateDocument(effectiveDoc),
    [effectiveDoc]
  );

  const renderMode = mode === 'auto' ? orchestrated.layoutConfig.renderMode : mode;

  if (renderMode === 'timeline') {
    return (
      <div style={{ fontFamily: readingFontStack }}>
        <TimelineRendererV2
          doc={orchestrated}
          fontSize={fontSize}
          lineHeight={lineHeight}
          markerConfigs={markerConfigs}
          hiddenMarkerIds={hiddenMarkerIds}
          markerTooltipPrefix={markerTooltipPrefix}
        />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: readingFontStack }}>
      <ColumnsRendererV2
        doc={orchestrated}
        fontSize={fontSize}
        lineHeight={lineHeight}
        markerConfigs={markerConfigs}
        hiddenMarkerIds={hiddenMarkerIds}
        markerTooltipPrefix={markerTooltipPrefix}
      />
    </div>
  );
};
