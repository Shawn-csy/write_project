import React, { useMemo } from 'react';
import { parseInline } from '../../../lib/parsers/inlineParser';
import { isInlineLike } from '../../../lib/markerRules';
import { InlineRenderer } from '../InlineRenderer';
import type { MarkerConfig } from '../../../types/script';

// Apply renderer.template to raw event text. Keeps event.text as semantic data;
// the formatted display string is only produced at render time.
export const applyDisplayTemplate = (text: string, cfg: MarkerConfig | undefined): string => {
  const tpl = String((cfg as any)?.renderer?.template ?? '');
  return tpl ? tpl.replace('{{content}}', text) : text;
};

interface EventTextV2Props {
  text: string;
  markerConfigs?: MarkerConfig[];
  hiddenMarkerIds?: string[];
  markerTooltipPrefix?: string;
}

export function EventTextV2({
  text,
  markerConfigs = [],
  hiddenMarkerIds = [],
  markerTooltipPrefix = '標記',
}: EventTextV2Props): React.JSX.Element {
  const inlineMarkerConfigs = useMemo(
    () => (Array.isArray(markerConfigs) ? markerConfigs : []).filter(isInlineLike),
    [markerConfigs]
  );
  const inlineNodes = useMemo(
    () => parseInline(text || '', inlineMarkerConfigs),
    [text, inlineMarkerConfigs]
  );

  return (
    <InlineRenderer
      nodes={inlineNodes}
      context={{
        markerConfigs: inlineMarkerConfigs,
        hiddenMarkerIds,
        markerTooltipPrefix,
      }}
    />
  );
}
