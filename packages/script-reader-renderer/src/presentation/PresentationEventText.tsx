import React, { useMemo } from 'react';
import { isInlineLike, parseInline, type InlineToken, type MarkerConfig } from '@write/script-engine';

// Apply renderer.template to raw event text. Keeps event.text as semantic data;
// the formatted display string is only produced at render time.
export const applyDisplayTemplate = (text: string, cfg: MarkerConfig | undefined): string => {
  const tpl = String((cfg as any)?.renderer?.template ?? '');
  return tpl ? tpl.replace('{{content}}', text) : text;
};

interface PresentationEventTextProps {
  text: string;
  markerConfigs?: MarkerConfig[];
  hiddenMarkerIds?: string[];
  markerTooltipPrefix?: string | null;
}

export function PresentationEventText({
  text,
  markerConfigs = [],
  hiddenMarkerIds = [],
  markerTooltipPrefix = '標記',
}: PresentationEventTextProps): React.JSX.Element {
  const inlineMarkerConfigs = useMemo(
    () => (Array.isArray(markerConfigs) ? markerConfigs : []).filter(isInlineLike),
    [markerConfigs]
  );
  const inlineNodes = useMemo(
    () => parseInline(text || '', inlineMarkerConfigs),
    [text, inlineMarkerConfigs]
  );

  return (
    <>
      {inlineNodes.map((node, index) => (
        <InlineTokenView
          key={`${index}-${node.type}-${node.id || ""}`}
          node={node}
          markerConfigs={inlineMarkerConfigs}
          hiddenMarkerIds={hiddenMarkerIds}
          markerTooltipPrefix={markerTooltipPrefix}
        />
      ))}
    </>
  );
}

function InlineTokenView({
  node,
  markerConfigs,
  hiddenMarkerIds,
  markerTooltipPrefix,
}: {
  node: InlineToken;
  markerConfigs: MarkerConfig[];
  hiddenMarkerIds: string[];
  markerTooltipPrefix: string | null;
}) {
  if (node.type !== "highlight") return <span>{node.content}</span>;
  if (node.id && hiddenMarkerIds.includes(node.id)) return null;

  const config = markerConfigs.find((item) => item.id === node.id);
  const style = { ...(config?.style || {}) } as React.CSSProperties;
  let displayText = node.content || "";
  const renderer = config?.renderer as { template?: string } | undefined;
  if (renderer?.template) {
    displayText = renderer.template.replace("{{content}}", displayText);
  } else if (config?.start && config?.end && config.showDelimiters) {
    displayText = `${config.start}${displayText}${config.end}`;
  }

  if (style.textAlign) {
    style.display = "block";
    style.width = "100%";
  }

  const markerName = String(config?.label || config?.name || node.id || "").trim();
  const tooltip = markerName && markerTooltipPrefix !== null
    ? `${markerTooltipPrefix ?? "標記"}: ${markerName}`
    : undefined;

  return (
    <span
      style={style}
      title={tooltip}
      data-marker-id={node.id || ""}
      data-marker-label={markerName}
    >
      {displayText}
    </span>
  );
}
