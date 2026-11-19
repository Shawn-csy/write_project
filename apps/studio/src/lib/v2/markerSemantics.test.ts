import { describe, expect, it } from 'vitest';
import { cloneDefaultLayoutConfig } from './defaultLayoutConfig';
import { applyMarkerSemanticRoutes } from './markerSemantics';

describe('marker semantic routing', () => {
  it('adds marker track routes from v2TrackId in marker configs', () => {
    const config = applyMarkerSemanticRoutes(cloneDefaultLayoutConfig(), [
      { id: 'custom-sfx', v2TrackId: 'sfx' },
    ]);

    const rule = config.routingRules.find((item) => item.match.markerId === 'custom-sfx');
    expect(rule?.targetTrackId).toBe('sfx');
  });

  it('generates kind fallback routes from track roles', () => {
    const config = applyMarkerSemanticRoutes(cloneDefaultLayoutConfig(), []);
    const speechRule = config.routingRules.find((r) => r.id === 'route-kind-speech');
    const sfxRule = config.routingRules.find((r) => r.id === 'route-kind-sfx');
    expect(speechRule?.targetTrackId).toBe('main');
    expect(sfxRule?.targetTrackId).toBe('sfx');
  });

  it('semantic routes take priority over kind fallback routes', () => {
    const config = applyMarkerSemanticRoutes(cloneDefaultLayoutConfig(), [
      { id: 'my-marker', v2TrackId: 'secondary' },
    ]);
    const semanticRule = config.routingRules.find((r) => r.match.markerId === 'my-marker');
    const kindRule = config.routingRules.find((r) => r.id === 'route-kind-speech');
    expect(semanticRule?.priority).toBeGreaterThan(kindRule?.priority ?? 0);
  });

  it('markers without v2TrackId do not produce routing rules', () => {
    const config = applyMarkerSemanticRoutes(cloneDefaultLayoutConfig(), [
      { id: 'unrouted-marker' },
    ]);
    const rule = config.routingRules.find((r) => r.match.markerId === 'unrouted-marker');
    expect(rule).toBeUndefined();
  });

  it('narration routes to narration track when present, else dialogue track', () => {
    const baseConfig = cloneDefaultLayoutConfig();
    // default config has no narration-role track → should fallback to dialogue (main)
    const config = applyMarkerSemanticRoutes(baseConfig, []);
    const narrationRule = config.routingRules.find((r) => r.id === 'route-kind-narration');
    expect(narrationRule?.targetTrackId).toBe('main');
  });
});
