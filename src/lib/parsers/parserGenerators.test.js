import { describe, it, expect, vi } from 'vitest';
import {
  escapeRegExp,
  toFullWidth,
  createDynamicParsers,
  createTextParser,
  mergeTextNodes
} from './parserGenerators.js';

describe('parserGenerators', () => {
  it('escapeRegExp should escape special characters', () => {
    const input = '.*+?^${}()|[]\\';
    expect(escapeRegExp(input)).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('toFullWidth should convert punctuation and spaces', () => {
    expect(toFullWidth('A-Z @!')).toBe('A－Z　＠！');
    // quick sanity: fullwidth @ and !
    const converted = toFullWidth('@!');
    expect(converted).toBe('＠！');
  });

  it('createDynamicParsers should parse prefix markers (halfwidth and fullwidth)', () => {
    const parsers = createDynamicParsers([
      { id: 'mention', start: '@', matchMode: 'prefix' }
    ]);

    const half = parsers.mention.parse('@hello');
    expect(half.status).toBe(true);
    expect(half.value).toEqual({ type: 'highlight', id: 'mention', content: 'hello' });

    const full = parsers.mention.parse('＠世界');
    expect(full.status).toBe(true);
    expect(full.value).toEqual({ type: 'highlight', id: 'mention', content: '世界' });
  });

  it('createDynamicParsers should parse enclosure markers', () => {
    const parsers = createDynamicParsers([
      { id: 'brace', start: '{', end: '}', matchMode: 'enclosure' }
    ]);

    const res = parsers.brace.parse('{ hello }');
    expect(res.status).toBe(true);
    expect(res.value).toEqual({ type: 'highlight', id: 'brace', content: 'hello' });
  });

  it('createDynamicParsers should parse regex markers and skip invalid regex', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const parsers = createDynamicParsers([
      { id: 'tag', matchMode: 'regex', regex: '##(\\w+)' },
      { id: 'bad', matchMode: 'regex', regex: '([unclosed' }
    ]);

    const res = parsers.tag.parse('##hello');
    expect(res.status).toBe(true);
    expect(res.value).toEqual({ type: 'highlight', id: 'tag', content: 'hello' });

    expect(parsers.bad).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('createTextParser should exclude marker start chars (including fullwidth)', () => {
    const parser = createTextParser([{ start: '@', type: 'inline' }]);

    const ok = parser.parse('hello world');
    expect(ok.status).toBe(true);
    expect(ok.value).toEqual({ type: 'text', content: 'hello world' });

    const blocked = parser.parse('＠not');
    expect(blocked.status).toBe(false);
  });

  it('mergeTextNodes should combine adjacent text nodes', () => {
    const nodes = [
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' ' },
      { type: 'highlight', content: 'world' },
      { type: 'text', content: '!' }
    ];

    const merged = mergeTextNodes(nodes);
    expect(merged).toEqual([
      { type: 'text', content: 'Hello ' },
      { type: 'highlight', content: 'world' },
      { type: 'text', content: '!' }
    ]);
  });
});
