import { useState, useCallback } from 'react';
import { readString, readNumber, writeValue } from '../lib/storage';

/**
 * A hook that manages state and syncs with local storage.
 * @param {string} key Storage key
 * @param {any} initialValue Default value
 * @param {'string'|'number'} type Type of data ('string' or 'number')
 */
export function usePersistentState(
  key: string,
  initialValue: any,
  type: 'string' | 'number' = 'string'
): [any, (newValue: any) => void] {
  const [state, setState] = useState(() => {
    // Read from storage on initialization
    if (type === 'number') {
      const stored = readNumber(key);
      return stored !== null && stored !== undefined ? stored : initialValue;
    }
    const stored = readString(key);
    return stored !== null && stored !== undefined ? stored : initialValue;
  });

  const setPersistentState = useCallback((newValue: any) => {
    setState(newValue);
    writeValue(key, newValue);
  }, [key]);

  return [state, setPersistentState];
}
