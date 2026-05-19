import React, { useMemo } from 'react';
import { parseInline } from '../../../lib/parsers/inlineParser';
import { isInlineLike } from '../../../lib/markerRules';
import { InlineRenderer } from '../InlineRenderer';
import type { MarkerConfig } from '../../../types/script';

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
