import { ROUTE_PRIORITY } from './routing';
import type {
  LayoutConfig,
  OrchestratedDocument,
  RangeSpan,
  RoutingRule,
  PresentationDocument,
  ScriptEvent,
  TrackLane,
} from './types';


const isRuleMatch = (event: ScriptEvent, rule: RoutingRule): boolean => {
  const { match } = rule;
  if (match.markerId && event.markerId !== match.markerId) return false;
  if (match.kind && event.kind !== match.kind) return false;
  if (match.speakerId && event.speakerId !== match.speakerId) return false;
  return true;
};

const resolveTrackId = (event: ScriptEvent, config: LayoutConfig): string | null => {
  const sortedRules = [...config.routingRules].sort((a, b) => b.priority - a.priority);
  const highPriorityRule = sortedRules.find((rule) => (
    rule.priority >= ROUTE_PRIORITY.preferredFloor && isRuleMatch(event, rule)
  ));
  if (highPriorityRule?.targetTrackId) return highPriorityRule.targetTrackId;

  const preferredTrackId = typeof event.attrs?.preferredTrackId === 'string'
    ? event.attrs.preferredTrackId.trim()
    : '';
  const preferredTrack = config.tracks.find((track) => track.id === preferredTrackId && track.enabled);
  if (preferredTrack) return preferredTrack.id;

  const matchedRule = sortedRules.find((rule) => isRuleMatch(event, rule));
  if (matchedRule?.targetTrackId) return matchedRule.targetTrackId;

  return config.fallbackTrackId || null;
};

export const orchestrateDocument = (doc: PresentationDocument): OrchestratedDocument => {
  const laneMap = new Map<string, TrackLane>();

  doc.layoutConfig.tracks
    .filter((track) => track.enabled)
    .sort((a, b) => a.order - b.order)
    .forEach((track) => {
      laneMap.set(track.id, { trackId: track.id, events: [] });
    });

  const unassignedEvents: ScriptEvent[] = [];
  // Filter out any range boundary events that may have leaked into the event stream
  // (e.g. from older adapters). Structural range information lives in doc.metadata.rangeSpans.
  const sourceEvents = [...doc.events]
    .filter((e) => e.attrs?.role !== 'range_start' && e.attrs?.role !== 'range_end')
    .sort((a, b) => a.lineSpan.start - b.lineSpan.start);

  const rangeSpans: RangeSpan[] = Array.isArray(doc.metadata?.rangeSpans)
    ? (doc.metadata.rangeSpans as RangeSpan[])
    : [];

  sourceEvents.forEach((event) => {
    const trackId = resolveTrackId(event, doc.layoutConfig);
    if (!trackId) {
      unassignedEvents.push(event);
      return;
    }

    const lane = laneMap.get(trackId);
    if (!lane) {
      unassignedEvents.push(event);
      return;
    }

    lane.events.push(event);
  });

  return {
    version: 2,
    layoutConfig: doc.layoutConfig,
    lanes: Array.from(laneMap.values()),
    unassignedEvents,
    rangeSpans,
  };
};
