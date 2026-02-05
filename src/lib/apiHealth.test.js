import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isApiOffline, markApiOffline, clearApiOffline } from './apiHealth.js';

describe('apiHealth', () => {
  beforeEach(() => {
    clearApiOffline();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start online', () => {
    expect(isApiOffline()).toBe(false);
  });

  it('should enter and exit cooldown based on time', () => {
    markApiOffline(new Error('network'), 'test');
    expect(isApiOffline()).toBe(true);

    vi.advanceTimersByTime(29999);
    expect(isApiOffline()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(isApiOffline()).toBe(false);
  });

  it('should clear cooldown manually', () => {
    markApiOffline(new Error('network'), 'test');
    expect(isApiOffline()).toBe(true);

    clearApiOffline();
    expect(isApiOffline()).toBe(false);
  });
});
