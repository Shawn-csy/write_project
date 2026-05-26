import { describe, expect, it } from 'vitest';
import { defaultMarkerConfigs } from '../../constants/defaultMarkerRules';
import { parseScreenplay } from '../screenplayAST';
import { buildScriptDocumentV2FromAst } from './astAdapter';

describe('buildScriptDocumentV2FromAst', () => {
  it('converts character+dialogue flow into speech events with speaker', () => {
    const ast = {
      children: [
        { type: 'character', text: '小雨', lineStart: 1, lineEnd: 1 },
        { type: 'dialogue', text: '晚安。', lineStart: 2, lineEnd: 2 },
      ],
    };

    const doc = buildScriptDocumentV2FromAst(ast);
    const speech = doc.events.find((event) => event.kind === 'speech');

    expect(speech?.speakerId).toBe('小雨');
    expect(speech?.text).toBe('晚安。');
  });

  it('maps layer markers into sfx/bgm kinds when markerConfigs provide v2EventKind', () => {
    const ast = {
      children: [
        { type: 'layer', layerType: 'rule-se-single', text: '腳步', lineStart: 1, lineEnd: 1 },
        { type: 'layer', layerType: 'rule-bg-start', text: '夜市環境音', lineStart: 2, lineEnd: 2 },
      ],
    };

    const doc = buildScriptDocumentV2FromAst(ast, {
      markerConfigs: [
        { id: 'rule-se-single', v2EventKind: 'sfx', v2TrackId: 'sfx' },
        { id: 'rule-bg-start', v2EventKind: 'bgm', v2TrackId: 'sfx' },
      ],
    });
    expect(doc.events[0].kind).toBe('sfx');
    expect(doc.events[1].kind).toBe('bgm');
  });

  it('falls back to meta kind for layer nodes without v2EventKind in markerConfigs', () => {
    const ast = {
      children: [
        { type: 'layer', layerType: 'unknown-layer', text: '未知', lineStart: 1, lineEnd: 1 },
      ],
    };

    const doc = buildScriptDocumentV2FromAst(ast);
    expect(doc.events[0].kind).toBe('meta');
  });

  it('uses marker semantic config when converting layer events', () => {
    const ast = {
      children: [
        { type: 'character', markerId: 'character', text: 'A', lineStart: 1, lineEnd: 1 },
        { type: 'layer', layerType: 'custom-dialogue', text: '這是自訂對白', lineStart: 2, lineEnd: 2 },
      ],
    };

    const doc = buildScriptDocumentV2FromAst(ast, {
      markerConfigs: [
        {
          id: 'custom-dialogue',
          v2EventKind: 'speech',
          v2SpeakerSource: 'active',
        },
      ],
    });
    const speech = doc.events.find((event) => event.text === '這是自訂對白');

    expect(speech?.kind).toBe('speech');
    expect(speech?.speakerId).toBe('A');
  });

  it('converts default #C + #D marker flow into speaker speech events', () => {
    const parsed = parseScreenplay('#C 小雨\n#D 你來了。', defaultMarkerConfigs);
    const doc = buildScriptDocumentV2FromAst(parsed.ast, {
      markerConfigs: defaultMarkerConfigs,
    });
    const speech = doc.events.find((event) => event.kind === 'speech');

    expect(speech?.speakerId).toBe('小雨');
    expect(speech?.text).toBe('你來了。');
  });

  it('does not emit an event for character cue nodes', () => {
    const ast = {
      children: [
        { type: 'character', text: '阿哲', lineStart: 1, lineEnd: 1 },
        { type: 'dialogue', text: '收到。', lineStart: 2, lineEnd: 2 },
      ],
    };

    const doc = buildScriptDocumentV2FromAst(ast);
    // Only one event: the dialogue. Character cues are pure speaker-state transitions.
    expect(doc.events).toHaveLength(1);
    expect(doc.events[0].kind).toBe('speech');
    expect(doc.events[0].speakerId).toBe('阿哲');
  });

  it('does not duplicate a standalone inline-layer line into the fallback track', () => {
    // #SE parsed as inline marker on a standalone action line should appear only in the
    // sfx lane, not also in the main fallback lane.
    const parsed = parseScreenplay('#SE 敲門聲', defaultMarkerConfigs);
    const doc = buildScriptDocumentV2FromAst(parsed.ast, {
      markerConfigs: defaultMarkerConfigs,
    });
    const sfxEvents = doc.events.filter((e) => e.kind === 'sfx');
    const narrationEvents = doc.events.filter((e) => e.kind === 'narration');
    expect(sfxEvents).toHaveLength(1);
    expect(sfxEvents[0].text).toBe('敲門聲');
    expect(narrationEvents).toHaveLength(0);
  });

  it('marks dual dialogue sides with primary and secondary preferred tracks', () => {
    const ast = {
      children: [
        {
          type: 'dual_dialogue',
          left: [
            {
              type: 'speech',
              character: 'A',
              children: [
                { type: 'dialogue', text: '左邊。', lineStart: 1, lineEnd: 1 },
              ],
            },
          ],
          right: [
            {
              type: 'speech',
              character: 'B',
              children: [
                { type: 'dialogue', text: '右邊。', lineStart: 1, lineEnd: 1 },
              ],
            },
          ],
        },
      ],
    };

    const doc = buildScriptDocumentV2FromAst(ast);

    expect(doc.events.find((event) => event.text === '左邊。')?.attrs?.preferredTrackId).toBe('main');
    expect(doc.events.find((event) => event.text === '右邊。')?.attrs?.preferredTrackId).toBe('secondary');
  });

  it('inherits preferred track from range marker v2TrackId for inner content events', () => {
    const ast = {
      children: [
        {
          type: 'range',
          startNode: { type: 'layer', layerType: 'angle-2', lineStart: 1, lineEnd: 1 },
          endNode: { type: 'layer', layerType: 'angle-2', lineStart: 3, lineEnd: 3 },
          children: [
            { type: 'action', text: 'BB', lineStart: 2, lineEnd: 2 },
          ],
        },
      ],
    };

    const doc = buildScriptDocumentV2FromAst(ast, {
      markerConfigs: [
        { id: 'angle-2', v2TrackId: 'secondary', v2RangeOwnsContent: true },
      ],
    });

    const contentEvent = doc.events.find((event) => event.text === 'BB');
    expect(contentEvent?.attrs?.preferredTrackId).toBe('secondary');
  });
});
