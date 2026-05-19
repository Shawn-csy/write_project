import { cloneDefaultLayoutConfig } from './defaultLayoutConfig';
import { getMarkerEventKind } from './markerSemantics';
import type { LayoutConfig, ScriptDocumentV2, ScriptEvent } from './types';
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

const classifyLayerKind = (markerId?: string): ScriptEvent['kind'] => {
  const id = String(markerId || '').toLowerCase();
  if (!id) return 'meta';
  if (id.includes('se') || id.includes('sfx')) return 'sfx';
  if (id.includes('bg')) return 'bgm';
  if (id.includes('position') || id.includes('pos')) return 'stage_direction';
  return 'meta';
};

const resolveDialogueTrackIds = (layoutConfig: LayoutConfig): [string | undefined, string | undefined] => {
  const dialogueTracks = [...layoutConfig.tracks]
    .filter((track) => track.enabled && track.role === 'dialogue')
    .sort((a, b) => a.order - b.order);
  return [dialogueTracks[0]?.id, dialogueTracks[1]?.id || dialogueTracks[0]?.id];
};

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
        activeSpeakerId = text || activeSpeakerId;
        pushEvent({
          kind: semanticKind || 'meta',
          text,
          speakerId: activeSpeakerId || undefined,
          markerId: node.markerId || 'character',
          lineSpan: span,
          attrs: { role: 'character_cue' },
        });
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
        pushEvent({
          kind: semanticKind || 'narration',
          text,
          markerId: node.markerId,
          lineSpan: span,
          attrs: { sourceType: node.type },
        });
        pushInlineLayerEvents(node.inline, span);
        return;
      }
      case 'layer': {
        const markerId = node.layerType || node.markerId;
        const markerConfig = markerId ? markerConfigById.get(String(markerId)) : undefined;
        const speakerSource = String(markerConfig?.v2SpeakerSource || '').trim();
        pushEvent({
          kind: getMarkerEventKind(markerConfig) || classifyLayerKind(markerId),
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
        if (node.startNode) {
          const startSpan = readLineSpan(node.startNode);
          const markerId = node.startNode.layerType || node.startNode.markerId;
          const markerConfig = markerId ? markerConfigById.get(String(markerId)) : undefined;
          pushEvent({
            kind: getMarkerEventKind(markerConfig) || classifyLayerKind(markerId),
            text: String(node.startNode.text || '').trim(),
            markerId,
            lineSpan: startSpan,
            attrs: { role: 'range_start' },
          });
        }
        (node.children || []).forEach(walk);
        if (node.endNode) {
          const endSpan = readLineSpan(node.endNode);
          const markerId = node.endNode.layerType || node.endNode.markerId;
          const markerConfig = markerId ? markerConfigById.get(String(markerId)) : undefined;
          pushEvent({
            kind: getMarkerEventKind(markerConfig) || classifyLayerKind(markerId),
            text: String(node.endNode.text || '').trim(),
            markerId,
            lineSpan: endSpan,
            attrs: { role: 'range_end' },
          });
        }
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
    metadata: options.metadata,
    layoutConfig,
    events,
  };
};
