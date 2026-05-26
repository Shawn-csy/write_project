import React, { useMemo, useSyncExternalStore } from 'react';
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
import { LinearRendererV2 } from './LinearRendererV2';

const MOBILE_QUERY = '(max-width: 767px)';

const subscribeToMobileViewport = (onStoreChange: () => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(MOBILE_QUERY);
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onStoreChange);
    return () => media.removeEventListener('change', onStoreChange);
  }
  media.addListener?.(onStoreChange);
  return () => media.removeListener?.(onStoreChange);
};

const getMobileViewportSnapshot = () => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') return window.matchMedia(MOBILE_QUERY).matches;
  return window.innerWidth < 768;
};

export type V2PresentationMode = 'auto' | 'columns' | 'timeline' | 'linear';

interface ScriptRendererV2Props {
  document?: ScriptDocumentV2;
  ast?: { children?: Array<Record<string, unknown>> } | null;
  layoutConfig?: LayoutConfig;
  markerConfigs?: MarkerConfig[];
  fontSize?: number;
  lineHeight?: number;
  readingFontFamily?: string;
  hiddenMarkerIds?: string[];
  markerTooltipPrefix?: string | null;
  mode?: V2PresentationMode;
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
  const isMobileViewport = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    () => false
  );
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

  const renderMode = mode === 'auto'
    ? (isMobileViewport ? 'linear' : orchestrated.layoutConfig.renderMode)
    : mode;

  if (renderMode === 'linear') {
    return (
      <div style={{ fontFamily: readingFontStack }}>
        <LinearRendererV2
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
