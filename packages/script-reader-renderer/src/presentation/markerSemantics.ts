import { ROUTE_PRIORITY } from './routing';
import { normalizeLayoutConfig } from './layoutConfig';
import type { EventKind, LayoutConfig, RoutingRule, TrackRole } from './types';
import type { MarkerConfig } from '@write/script-engine';

const EVENT_KINDS = new Set<EventKind>(['speech', 'sfx', 'bgm', 'stage_direction', 'narration', 'meta', 'custom']);

export const normalizeEventKind = (value: unknown): EventKind | null => {
  const kind = String(value || '').trim() as EventKind;
  return EVENT_KINDS.has(kind) ? kind : null;
};

export const getMarkerEventKind = (marker: MarkerConfig | undefined): EventKind | null => (
  normalizeEventKind(marker?.v2EventKind)
);

export const makeMarkerSemanticRoute = (marker: MarkerConfig): RoutingRule | null => {
  const markerId = String(marker?.id || '').trim();
  const targetTrackId = String(marker?.v2TrackId || '').trim();
  if (!markerId || !targetTrackId) return null;
  return {
    id: `route-marker-semantic-${markerId.replace(/[^a-z0-9_-]/gi, '-')}`,
    priority: ROUTE_PRIORITY.markerSemantic,
    match: { markerId },
    targetTrackId,
  };
};

const firstTrackByRole = (layoutConfig: LayoutConfig, role: TrackRole): string | undefined =>
  [...layoutConfig.tracks]
    .filter((t) => t.enabled && t.role === role)
    .sort((a, b) => a.order - b.order)[0]?.id;

const makeKindFallbackRoutes = (layoutConfig: LayoutConfig): RoutingRule[] => {
  const dialogueTrackId = firstTrackByRole(layoutConfig, 'dialogue');
  const sfxTrackId = firstTrackByRole(layoutConfig, 'sfx');
  const narrationTrackId = firstTrackByRole(layoutConfig, 'narration') ?? dialogueTrackId;
  const rules: RoutingRule[] = [];
  if (dialogueTrackId) {
    rules.push({ id: 'route-kind-speech', priority: ROUTE_PRIORITY.kindFallback.speech, match: { kind: 'speech' }, targetTrackId: dialogueTrackId });
    rules.push({ id: 'route-kind-meta', priority: ROUTE_PRIORITY.kindFallback.meta, match: { kind: 'meta' }, targetTrackId: dialogueTrackId });
  }
  if (narrationTrackId) {
    rules.push({ id: 'route-kind-narration', priority: ROUTE_PRIORITY.kindFallback.narration, match: { kind: 'narration' }, targetTrackId: narrationTrackId });
    rules.push({ id: 'route-kind-stage', priority: ROUTE_PRIORITY.kindFallback.stageDirection, match: { kind: 'stage_direction' }, targetTrackId: narrationTrackId });
  }
  if (sfxTrackId) {
    rules.push({ id: 'route-kind-sfx', priority: ROUTE_PRIORITY.kindFallback.sfx, match: { kind: 'sfx' }, targetTrackId: sfxTrackId });
    rules.push({ id: 'route-kind-bgm', priority: ROUTE_PRIORITY.kindFallback.bgm, match: { kind: 'bgm' }, targetTrackId: sfxTrackId });
  }
  return rules;
};

export const applyMarkerSemanticRoutes = (
  layoutConfig: LayoutConfig,
  markerConfigs: MarkerConfig[] = []
): LayoutConfig => {
  const base = normalizeLayoutConfig(layoutConfig);
  const semanticRules = markerConfigs
    .map(makeMarkerSemanticRoute)
    .filter((rule): rule is RoutingRule => Boolean(rule));
  const kindFallbackRules = makeKindFallbackRoutes(base);

  // Preserve any manually-added rules that don't conflict with semantic routes
  const semanticRuleIds = new Set(semanticRules.map((rule) => rule.id));
  const semanticMarkerIds = new Set(semanticRules.map((rule) => rule.match.markerId).filter(Boolean));
  const kindFallbackIds = new Set(kindFallbackRules.map((rule) => rule.id));
  const preservedRules = base.routingRules.filter((rule) => (
    !semanticRuleIds.has(rule.id) &&
    !semanticMarkerIds.has(rule.match?.markerId) &&
    !kindFallbackIds.has(rule.id)
  ));

  return normalizeLayoutConfig({
    ...base,
    routingRules: [...kindFallbackRules, ...preservedRules, ...semanticRules],
  });
};
