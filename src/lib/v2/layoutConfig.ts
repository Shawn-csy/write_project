import { cloneDefaultLayoutConfig } from './defaultLayoutConfig';
import type { EventKind, LayoutConfig, LayoutRenderMode, RoutingRule, TrackConfig, TrackRole } from './types';

const EVENT_KINDS = new Set<EventKind>(['speech', 'sfx', 'bgm', 'stage_direction', 'narration', 'meta', 'custom']);
const TRACK_ROLES = new Set<TrackRole>(['dialogue', 'sfx', 'narration', 'meta', 'custom']);

const toNonEmptyString = (value: unknown, fallback: string): string => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const normalizeTrack = (value: unknown, index: number): TrackConfig | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<TrackConfig>;
  const id = toNonEmptyString(raw.id, '');
  if (!id) return null;
  const role = TRACK_ROLES.has(raw.role as TrackRole) ? raw.role as TrackRole : 'custom';
  const order = Number.isFinite(Number(raw.order)) ? Number(raw.order) : (index + 1) * 10;
  const desktopWidth = Number.isFinite(Number(raw.desktopWidth)) && Number(raw.desktopWidth) > 0
    ? Number(raw.desktopWidth)
    : undefined;

  return {
    id,
    name: toNonEmptyString(raw.name, id),
    role,
    order,
    enabled: raw.enabled !== false,
    desktopWidth,
    mobileBehavior: raw.mobileBehavior === 'inline' || raw.mobileBehavior === 'badge' || raw.mobileBehavior === 'collapse'
      ? raw.mobileBehavior
      : undefined,
    style: raw.style && typeof raw.style === 'object' && !Array.isArray(raw.style)
      ? raw.style as Record<string, string>
      : undefined,
  };
};

const normalizeRule = (value: unknown, index: number, validTrackIds: Set<string>): RoutingRule | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<RoutingRule>;
  const targetTrackId = toNonEmptyString(raw.targetTrackId, '');
  if (!targetTrackId || !validTrackIds.has(targetTrackId)) return null;

  const rawMatch = raw.match && typeof raw.match === 'object' ? raw.match : {};
  const markerId = toNonEmptyString((rawMatch as Record<string, unknown>).markerId, '');
  const kindCandidate = (rawMatch as Record<string, unknown>).kind as EventKind;
  const kind = EVENT_KINDS.has(kindCandidate) ? kindCandidate : undefined;
  const speakerId = toNonEmptyString((rawMatch as Record<string, unknown>).speakerId, '');
  if (!markerId && !kind && !speakerId) return null;

  return {
    id: toNonEmptyString(raw.id, `route-${index + 1}`),
    priority: Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : 0,
    match: {
      ...(markerId ? { markerId } : {}),
      ...(kind ? { kind } : {}),
      ...(speakerId ? { speakerId } : {}),
    },
    targetTrackId,
  };
};

export const normalizeLayoutConfig = (value: unknown): LayoutConfig => {
  const fallback = cloneDefaultLayoutConfig();
  if (!value || typeof value !== 'object') return fallback;

  const raw = value as Partial<LayoutConfig>;
  const tracks = Array.isArray(raw.tracks)
    ? raw.tracks.map(normalizeTrack).filter((track): track is TrackConfig => Boolean(track))
    : fallback.tracks;
  const safeTracks = tracks.length > 0 ? tracks : fallback.tracks;
  const validTrackIds = new Set(safeTracks.map((track) => track.id));
  const fallbackTrackId = typeof raw.fallbackTrackId === 'string' && validTrackIds.has(raw.fallbackTrackId)
    ? raw.fallbackTrackId
    : validTrackIds.has(fallback.fallbackTrackId)
      ? fallback.fallbackTrackId
      : safeTracks[0].id;
  const routingRules = Array.isArray(raw.routingRules)
    ? raw.routingRules
        .map((rule, index) => normalizeRule(rule, index, validTrackIds))
        .filter((rule): rule is RoutingRule => Boolean(rule))
    : [];

  return {
    version: 1,
    renderMode: (raw.renderMode === 'timeline' ? 'timeline' : 'columns') as LayoutRenderMode,
    fallbackTrackId,
    tracks: safeTracks,
    routingRules,
  };
};
