import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readString, readNumber, writeValue } from './storage.js';

describe('storage', () => {
  const originalStorage = globalThis.localStorage;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.localStorage = originalStorage;
    vi.restoreAllMocks();
  });

  it('readString should return null for missing keys or disallowed values', () => {
    expect(readString('missing')).toBeNull();

    localStorage.setItem('lang', 'en');
    expect(readString('lang', ['zh', 'ja'])).toBeNull();
  });

  it('readString should return stored value when allowed', () => {
    localStorage.setItem('theme', 'dark');
    expect(readString('theme', ['light', 'dark'])).toBe('dark');
  });

  it('readNumber should parse numbers and return null on NaN', () => {
    localStorage.setItem('fontSize', '16');
    localStorage.setItem('invalid', 'abc');

    expect(readNumber('fontSize')).toBe(16);
    expect(readNumber('invalid')).toBeNull();
  });

  it('writeValue should store values as strings', () => {
    writeValue('count', 5);
    expect(localStorage.getItem('count')).toBe('5');
  });

  it('should handle storage errors gracefully', () => {
    const errorStorage = {
      getItem: () => { throw new Error('fail'); },
      setItem: () => { throw new Error('fail'); },
      clear: () => {}
    };

    globalThis.localStorage = errorStorage;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(readString('key')).toBeNull();
    expect(readNumber('key')).toBeNull();
    writeValue('key', 'value');

    expect(warn).toHaveBeenCalled();
  });
});
