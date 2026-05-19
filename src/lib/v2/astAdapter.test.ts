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

  it('maps layer markers into sfx/bgm/stage kinds', () => {
    const ast = {
      children: [
        { type: 'layer', layerType: 'rule-se-single', text: '腳步', lineStart: 1, lineEnd: 1 },
        { type: 'layer', layerType: 'rule-bg-start', text: '夜市環境音', lineStart: 2, lineEnd: 2 },
      ],
    };

    const doc = buildScriptDocumentV2FromAst(ast);
    expect(doc.events[0].kind).toBe('sfx');
    expect(doc.events[1].kind).toBe('bgm');
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
});
