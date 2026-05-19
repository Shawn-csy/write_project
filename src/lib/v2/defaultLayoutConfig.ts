import type { LayoutConfig } from './types';

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  version: 1,
  renderMode: 'columns',
  fallbackTrackId: 'main',
  tracks: [
    {
      id: 'sfx',
      name: '音效',
      role: 'sfx',
      order: 10,
      enabled: true,
      desktopWidth: 0.26,
      mobileBehavior: 'badge',
    },
    {
      id: 'main',
      name: '主對白',
      role: 'dialogue',
      order: 20,
      enabled: true,
      desktopWidth: 0.48,
      mobileBehavior: 'inline',
    },
    {
      id: 'secondary',
      name: '副對白',
      role: 'dialogue',
      order: 30,
      enabled: true,
      desktopWidth: 0.26,
      mobileBehavior: 'inline',
    },
  ],
  routingRules: [],
};

export const cloneDefaultLayoutConfig = (): LayoutConfig =>
  JSON.parse(JSON.stringify(DEFAULT_LAYOUT_CONFIG));
