import { useState, useEffect } from 'react';
import { readString, readNumber, writeValue } from '../lib/storage';

/**
 * A hook that manages state and syncs with local storage.
 * @param {string} key Storage key
 * @param {any} initialValue Default value
 * @param {'string'|'number'} type Type of data ('string' or 'number')
 */
export function usePersistentState(key, initialValue, type = 'string') {
  const [state, setState] = useState(() => {
    // Read from storage on initialization
    if (type === 'number') {
      return readNumber(key, initialValue);
    }
    return readString(key, initialValue);
  });

  const setPersistentState = (newValue) => {
    setState(newValue);
    writeValue(key, newValue);
  };

  return [state, setPersistentState];
}
