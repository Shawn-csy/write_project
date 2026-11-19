import { useState, useCallback } from "react";

const readStoredValue = <T>(key: string, initialValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return initialValue;

    if (typeof initialValue === "number") {
      const parsed = Number(raw);
      return (Number.isNaN(parsed) ? initialValue : parsed) as T;
    }

    if (typeof initialValue === "string") {
      return raw as T;
    }

    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return initialValue;
  }
};

export function usePersistentState<T>(
  key: string,
  initialValue: T,
  _type?: "string" | "number"
): [T, (newValue: T) => void] {
  const [state, setState] = useState<T>(() => readStoredValue(key, initialValue));

  const setPersistentState = useCallback(
    (newValue: T) => {
      setState(newValue);
      try {
        if (typeof newValue === "string" || typeof newValue === "number") {
          localStorage.setItem(key, String(newValue));
        } else {
          localStorage.setItem(key, JSON.stringify(newValue));
        }
      } catch {
        // no-op: keep runtime behavior resilient when storage is unavailable/quota-exceeded
      }
    },
    [key]
  );

  return [state, setPersistentState];
}
