import { describe, expect, it } from 'vitest';
import { cloneDefaultLayoutConfig } from './defaultLayoutConfig';
import { applyMarkerSemanticRoutes } from './markerSemantics';
import { orchestrateDocument } from './orchestrator';
import type { PresentationDocument } from './types';

describe('v2 orchestrator', () => {
  it('routes events by marker and kind into configured lanes', () => {
    // routing rules must be applied via applyMarkerSemanticRoutes before orchestration
    const layoutConfig = applyMarkerSemanticRoutes(cloneDefaultLayoutConfig(), [
      { id: 'rule-se-single', v2TrackId: 'sfx', v2EventKind: 'sfx' },
    ]);
    const doc: PresentationDocument = {
      version: 2,
      layoutConfig,
      events: [
        {
          id: 'e1',
          kind: 'sfx',
          text: '關門聲',
          markerId: 'rule-se-single',
          lineSpan: { start: 1, end: 1 },
        },
        {
          id: 'e2',
          kind: 'speech',
          text: '你到了。',
          speakerId: 'A',
          lineSpan: { start: 2, end: 2 },
        },
      ],
    };

    const out = orchestrateDocument(doc);
    const sfxLane = out.lanes.find((lane) => lane.trackId === 'sfx');
    const mainLane = out.lanes.find((lane) => lane.trackId === 'main');

    expect(sfxLane?.events.map((e) => e.id)).toEqual(['e1']);
    expect(mainLane?.events.map((e) => e.id)).toEqual(['e2']);
    expect(out.unassignedEvents).toEqual([]);
  });

  it('keeps unmatched events in unassigned list when fallback lane is disabled/missing', () => {
    const config = cloneDefaultLayoutConfig();
    config.fallbackTrackId = 'missing';

    const doc: PresentationDocument = {
      version: 2,
      layoutConfig: config,
      events: [
        {
          id: 'e3',
          kind: 'custom',
          text: '未匹配',
          lineSpan: { start: 3, end: 3 },
        },
      ],
    };

    const out = orchestrateDocument(doc);
    expect(out.unassignedEvents.map((e) => e.id)).toEqual(['e3']);
  });

  it('lets speaker routing override generic speech routing', () => {
    const config = cloneDefaultLayoutConfig();
    config.routingRules.push({
      id: 'route-speaker-b',
      priority: 900,
      match: { speakerId: 'B' },
      targetTrackId: 'secondary',
    });

    const doc: PresentationDocument = {
      version: 2,
      layoutConfig: config,
      events: [
        {
          id: 'e4',
          kind: 'speech',
          text: '右欄台詞',
          speakerId: 'B',
          lineSpan: { start: 4, end: 4 },
        },
      ],
    };

    const out = orchestrateDocument(doc);
    const secondaryLane = out.lanes.find((lane) => lane.trackId === 'secondary');
    expect(secondaryLane?.events.map((event) => event.id)).toEqual(['e4']);
  });

  it('uses preferred track metadata when no explicit route matches', () => {
    const config = cloneDefaultLayoutConfig();

    const doc: PresentationDocument = {
      version: 2,
      layoutConfig: config,
      events: [
        {
          id: 'e5',
          kind: 'speech',
          text: '右欄預設台詞',
          speakerId: 'B',
          lineSpan: { start: 5, end: 5 },
          attrs: { preferredTrackId: 'secondary' },
        },
      ],
    };

    const out = orchestrateDocument(doc);
    const secondaryLane = out.lanes.find((lane) => lane.trackId === 'secondary');
    expect(secondaryLane?.events.map((event) => event.id)).toEqual(['e5']);
  });

  it('lets explicit routing override preferred track metadata', () => {
    const config = cloneDefaultLayoutConfig();
    config.routingRules.push({
      id: 'route-speaker-b-main',
      priority: 900,
      match: { speakerId: 'B' },
      targetTrackId: 'main',
    });

    const doc: PresentationDocument = {
      version: 2,
      layoutConfig: config,
      events: [
        {
          id: 'e6',
          kind: 'speech',
          text: '明確路由優先',
          speakerId: 'B',
          lineSpan: { start: 6, end: 6 },
          attrs: { preferredTrackId: 'secondary' },
        },
      ],
    };

    const out = orchestrateDocument(doc);
    const mainLane = out.lanes.find((lane) => lane.trackId === 'main');
    const secondaryLane = out.lanes.find((lane) => lane.trackId === 'secondary');
    expect(mainLane?.events.map((event) => event.id)).toEqual(['e6']);
    expect(secondaryLane?.events.map((event) => event.id)).toEqual([]);
  });
});
