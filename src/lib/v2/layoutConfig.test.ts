import { describe, expect, it } from 'vitest';
import { normalizeLayoutConfig } from './layoutConfig';

describe('normalizeLayoutConfig', () => {
  it('falls back when config is not an object', () => {
    const config = normalizeLayoutConfig(null);
    expect(config.fallbackTrackId).toBe('main');
    expect(config.tracks.length).toBeGreaterThan(0);
    expect(config.routingRules).toEqual([]);
  });

  it('drops invalid tracks and routing rules', () => {
    const config = normalizeLayoutConfig({
      renderMode: 'timeline',
      fallbackTrackId: 'main',
      tracks: [
        { id: 'main', name: 'Main', role: 'dialogue', order: 1, enabled: true },
        { name: 'Missing id' },
      ],
      routingRules: [
        { id: 'valid', priority: 10, match: { kind: 'speech' }, targetTrackId: 'main' },
        { id: 'missing-match', priority: 5, targetTrackId: 'main' },
        { id: 'missing-track', priority: 5, match: { kind: 'sfx' }, targetTrackId: 'ghost' },
      ],
    });

    expect(config.renderMode).toBe('timeline');
    expect(config.tracks.map((track) => track.id)).toEqual(['main']);
    expect(config.routingRules.map((rule) => rule.id)).toEqual(['valid']);
  });

  it('keeps fallbackTrackId valid when custom tracks do not include the default main track', () => {
    const config = normalizeLayoutConfig({
      fallbackTrackId: 'missing',
      tracks: [
        { id: 'narrator', name: 'Narrator', role: 'narration', order: 1, enabled: true },
      ],
      routingRules: [],
    });

    expect(config.fallbackTrackId).toBe('narrator');
  });
});
