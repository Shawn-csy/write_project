import React, { useMemo, useSyncExternalStore } from 'react';
import { buildPresentationDocumentFromAst } from './astAdapter';
import { cloneDefaultLayoutConfig } from './defaultLayoutConfig';
import { normalizeLayoutConfig } from './layoutConfig';
import { applyMarkerSemanticRoutes } from './markerSemantics';
import { orchestrateDocument } from './orchestrator';
import type { LayoutConfig, OrchestratedDocument, PresentationDocument } from './types';
import type { MarkerConfig } from '@write/script-engine';
import { resolveReadingFontStack } from './utils';
import { ColumnsPresentationRenderer } from './ColumnsPresentationRenderer';
import { TimelinePresentationRenderer } from './TimelinePresentationRenderer';
import { LinearPresentationRenderer } from './LinearPresentationRenderer';

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

export type PresentationMode = 'auto' | 'columns' | 'timeline' | 'linear';

interface ScriptPresentationRendererProps {
  document?: PresentationDocument;
  ast?: { children?: Array<Record<string, unknown>> } | null;
  layoutConfig?: LayoutConfig;
  markerConfigs?: MarkerConfig[];
  fontSize?: number;
  lineHeight?: number;
  readingFontFamily?: string;
  hiddenMarkerIds?: string[];
  markerTooltipPrefix?: string | null;
  mode?: PresentationMode;
}

export const ScriptPresentationRenderer = ({
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
}: ScriptPresentationRendererProps): React.JSX.Element => {
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
    return buildPresentationDocumentFromAst(ast, {
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
        <LinearPresentationRenderer
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
        <TimelinePresentationRenderer
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
      <ColumnsPresentationRenderer
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
