import { cloneDefaultLayoutConfig } from './defaultLayoutConfig';
import { getMarkerEventKind } from './markerSemantics';
import type { LayoutConfig, RangeSpan, ScriptDocumentV2, ScriptEvent } from './types';
import type { MarkerConfig } from '../../types/script';

interface InlineSpan {
  type?: string;
  id?: string;
  content?: string;
}

interface AstNodeLike {
  type?: string;
  text?: string;
  character?: string;
  markerId?: string;
  layerType?: string;
  lineStart?: number;
  lineEnd?: number;
  inline?: InlineSpan[];
  children?: AstNodeLike[];
  left?: AstNodeLike[];
  right?: AstNodeLike[];
  startNode?: AstNodeLike;
  endNode?: AstNodeLike | null;
}

interface AdaptOptions {
  layoutConfig?: LayoutConfig;
  metadata?: Record<string, unknown>;
  markerConfigs?: MarkerConfig[];
}

const readLineSpan = (node: AstNodeLike): { start: number; end: number } => {
  const start = Number.isFinite(node.lineStart) ? Number(node.lineStart) : 0;
  const end = Number.isFinite(node.lineEnd) ? Number(node.lineEnd) : start;
  return {
    start: start > 0 ? start : 1,
    end: end > 0 ? end : Math.max(1, start),
  };
};

// When a layer node has no explicit v2EventKind on its marker config, fall back
// to 'meta' rather than guessing from the markerId string. Callers that need a
// specific kind should set v2EventKind on the marker config.
const layerKindFallback = (): ScriptEvent['kind'] => 'meta';

const resolveDialogueTrackIds = (layoutConfig: LayoutConfig): [string | undefined, string | undefined] => {
  const dialogueTracks = [...layoutConfig.tracks]
    .filter((track) => track.enabled && track.role === 'dialogue')
    .sort((a, b) => a.order - b.order);
  return [dialogueTracks[0]?.id, dialogueTracks[1]?.id || dialogueTracks[0]?.id];
};

const readRangeMarkerId = (node: AstNodeLike): string => (
  String(
    (node.startNode?.layerType ||
      node.startNode?.markerId ||
      node.endNode?.layerType ||
      node.endNode?.markerId ||
      node.markerId ||
      '')
  ).trim()
);

const readNodeText = (node: AstNodeLike | null | undefined): string => String(node?.text || '').trim();

export const buildScriptDocumentV2FromAst = (
  ast: { children?: AstNodeLike[] } | null | undefined,
  options: AdaptOptions = {}
): ScriptDocumentV2 => {
  const layoutConfig = options.layoutConfig || cloneDefaultLayoutConfig();
  const markerConfigById = new Map(
    (options.markerConfigs || [])
      .filter((marker) => String(marker?.id || '').trim())
      .map((marker) => [String(marker.id), marker])
  );
  const events: ScriptEvent[] = [];
  let eventCounter = 0;
  const rangeSpans: RangeSpan[] = [];
  let activeSpeakerId = '';
  let preferredTrackId: string | undefined;
  const [primaryDialogueTrackId, secondaryDialogueTrackId] = resolveDialogueTrackIds(layoutConfig);

  const pushEvent = (event: Omit<ScriptEvent, 'id'>) => {
    eventCounter += 1;
    const attrs = preferredTrackId
      ? { ...(event.attrs || {}), preferredTrackId }
      : event.attrs;
    events.push({ id: `e${eventCounter}`, ...event, attrs });
  };

  // Push independent events for inline spans whose marker has v2TrackId set.
  // This allows e.g. (SE音效) inside dialogue to appear simultaneously in the sfx column.
  const pushInlineLayerEvents = (inline: InlineSpan[] | undefined, lineSpan: { start: number; end: number }) => {
    if (!inline || inline.length === 0) return;
    for (const span of inline) {
      const spanMarkerId = String(span.id || '').trim();
      if (!spanMarkerId) continue;
      const spanMarkerConfig = markerConfigById.get(spanMarkerId);
      if (!spanMarkerConfig?.v2TrackId) continue;
      pushEvent({
        kind: getMarkerEventKind(spanMarkerConfig) || 'sfx',
        text: String(span.content || '').trim(),
        markerId: spanMarkerId,
        lineSpan,
        attrs: { sourceType: 'inline_layer' },
      });
    }
  };

  const withPreferredTrack = (trackId: string | undefined, callback: () => void) => {
    const previousTrackId = preferredTrackId;
    preferredTrackId = trackId || previousTrackId;
    try {
      callback();
    } finally {
      preferredTrackId = previousTrackId;
    }
  };

  const resolveMarkerTrackId = (markerId: string | undefined): string | undefined => {
    if (!markerId) return undefined;
    const config = markerConfigById.get(String(markerId).trim());
    const targetTrackId = String(config?.v2TrackId || '').trim();
    return targetTrackId || undefined;
  };

  const pushRangeBoundaryContentIfPresent = (
    boundaryNode: AstNodeLike | null | undefined,
    markerId: string,
  ) => {
    if (!boundaryNode) return;
    const text = readNodeText(boundaryNode);
    if (!text) return;
    const span = readLineSpan(boundaryNode);
    const markerConfig = markerId ? markerConfigById.get(markerId) : undefined;
    pushEvent({
      kind: getMarkerEventKind(markerConfig) || 'narration',
      text,
      markerId: markerId || undefined,
      lineSpan: span,
      attrs: { sourceType: 'range_boundary_content' },
    });
  };

  const walk = (node: AstNodeLike | null | undefined) => {
    if (!node || !node.type) return;

    if (node.type === 'root') {
      (node.children || []).forEach(walk);
      return;
    }

    if (node.type === 'dual_dialogue') {
      withPreferredTrack(primaryDialogueTrackId, () => {
        (node.left || []).forEach(walk);
      });
      withPreferredTrack(secondaryDialogueTrackId, () => {
        (node.right || []).forEach(walk);
      });
      withPreferredTrack(primaryDialogueTrackId, () => {
        (node.children || []).forEach(walk);
      });
      return;
    }

    if (node.type === 'speech') {
      const speechSpeaker = String(node.character || '').trim();
      if (speechSpeaker) activeSpeakerId = speechSpeaker;
      (node.children || []).forEach((child) => {
        if (child.type === 'dialogue') {
          const span = readLineSpan(child);
          pushEvent({
            kind: 'speech',
            text: String(child.text || '').trim(),
            speakerId: speechSpeaker || activeSpeakerId || undefined,
            markerId: child.markerId || node.markerId,
            lineSpan: span,
          });
          pushInlineLayerEvents(child.inline, span);
          return;
        }
        walk(child);
      });
      return;
    }

    const span = readLineSpan(node);
    const text = String(node.text || '').trim();
    const nodeMarkerId = String(node.layerType || node.markerId || '').trim();
    const nodeMarkerConfig = nodeMarkerId ? markerConfigById.get(nodeMarkerId) : undefined;
    const semanticKind = getMarkerEventKind(nodeMarkerConfig);

    switch (node.type) {
      case 'character': {
        // Character cues are speaker-state transitions, not renderable content events.
        // The speaker identity propagates to subsequent events via activeSpeakerId /
        // speakerId on each dialogue or layer event. No event is emitted here.
        activeSpeakerId = text || activeSpeakerId;
        return;
      }
      case 'dialogue': {
        pushEvent({
          kind: semanticKind || 'speech',
          text,
          speakerId: activeSpeakerId || undefined,
          markerId: node.markerId,
          lineSpan: span,
        });
        return;
      }
      case 'action':
      case 'parenthetical':
      case 'transition':
      case 'centered': {
        // V1 inline markers (e.g. rule-se-single with matchMode:'prefix') can match a
        // whole line when the user writes a standalone SFX/BGM cue using an inline-typed
        // marker config. In that case the V1 parser emits an 'action' node whose entire
        // content is captured as a single inline span with a v2TrackId.
        //
        // If the inline array contains at least one span routed to a dedicated track
        // AND there is no remaining plain-text content, the line is purely a layer cue.
        // Emit only the routed inline layer events; suppress the action event so the cue
        // does not also appear in the fallback (main) track.
        const inlineSpans = node.inline || [];
        const hasPlainText = inlineSpans.some(
          (s) => s.type === 'text' && String(s.content || '').trim()
        );
        const hasInlineLayers = inlineSpans.some((s) => {
          const cfg = s.id ? markerConfigById.get(String(s.id)) : undefined;
          return Boolean(cfg?.v2TrackId);
        });
        if (!hasPlainText && hasInlineLayers) {
          pushInlineLayerEvents(inlineSpans, span);
          return;
        }
        pushEvent({
          kind: semanticKind || 'narration',
          text,
          markerId: node.markerId,
          lineSpan: span,
          attrs: { sourceType: node.type },
        });
        pushInlineLayerEvents(inlineSpans, span);
        return;
      }
      case 'layer': {
        const markerId = node.layerType || node.markerId;
        const markerConfig = markerId ? markerConfigById.get(String(markerId)) : undefined;
        const speakerSource = String(markerConfig?.v2SpeakerSource || '').trim();
        pushEvent({
          kind: getMarkerEventKind(markerConfig) || layerKindFallback(),
          text,
          markerId,
          speakerId: speakerSource === 'active'
            ? activeSpeakerId || undefined
            : speakerSource === 'self'
              ? text || undefined
              : undefined,
          lineSpan: span,
          attrs: { sourceType: 'layer' },
        });
        return;
      }
      case 'range': {
        // Collect the span as structured metadata; do NOT push boundary events into
        // the content stream. Renderers and row grouping read doc.rangeSpans instead.
        const startSpan = node.startNode ? readLineSpan(node.startNode) : null;
        const endSpan = node.endNode ? readLineSpan(node.endNode) : null;
        const rangeMarkerId = readRangeMarkerId(node);
        if (rangeMarkerId && startSpan && endSpan) {
          rangeSpans.push({ markerId: rangeMarkerId, startLine: startSpan.start, endLine: endSpan.end });
        }
        const rangeTrackId = resolveMarkerTrackId(rangeMarkerId);
        const rangeMarkerConfig = rangeMarkerId ? markerConfigById.get(rangeMarkerId) : undefined;
        // v2RangeOwnsContent=true  → children belong to the range's track (e.g. @1/@2 splits).
        // v2RangeOwnsContent=false → children route by their own marker/kind rules (default).
        // Boundary-line text always goes to the range's track regardless of this flag.
        const ownsContent = Boolean(rangeMarkerConfig?.v2RangeOwnsContent);
        withPreferredTrack(rangeTrackId, () => pushRangeBoundaryContentIfPresent(node.startNode, rangeMarkerId));
        if (ownsContent) {
          withPreferredTrack(rangeTrackId, () => (node.children || []).forEach(walk));
        } else {
          (node.children || []).forEach(walk);
        }
        withPreferredTrack(rangeTrackId, () => pushRangeBoundaryContentIfPresent(node.endNode, rangeMarkerId));
        return;
      }
      default: {
        (node.children || []).forEach(walk);
      }
    }
  };

  (ast?.children || []).forEach(walk);

  return {
    version: 2,
    metadata: { ...options.metadata, rangeSpans },
    layoutConfig,
    events,
  };
};
