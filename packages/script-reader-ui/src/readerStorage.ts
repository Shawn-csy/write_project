import type { ReaderStorageAdapter } from "./useReaderState";

/**
 * Creates a ReaderStorageAdapter backed by window.localStorage.
 * The prefix namespaces all keys so multiple reader instances don't collide.
 *
 * Safe to call during SSR — the adapter object can be created on the server.
 * get/set/remove are only invoked inside useEffect hooks (after mount), never during render.
 */
export function createLocalStorageReaderStorage(prefix: string): ReaderStorageAdapter {
  return {
    get(key) {
      try {
        return window.localStorage.getItem(`${prefix}:${key}`);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(`${prefix}:${key}`, value);
      } catch {
        // quota exceeded or storage blocked — silently ignore
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(`${prefix}:${key}`);
      } catch {
        // silently ignore
      }
    },
  };
}
