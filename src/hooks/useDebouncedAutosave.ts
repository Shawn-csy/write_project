import { useEffect, useRef } from "react";
import type { DependencyList } from "react";

interface UseDebouncedAutosaveOptions {
  enabled: boolean;
  delayMs?: number;
  save: () => Promise<void> | void;
  deps: DependencyList;
}

export function useDebouncedAutosave({
  enabled,
  delayMs = 800,
  save,
  deps,
}: UseDebouncedAutosaveOptions): void {
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(() => {
      saveRef.current();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [enabled, delayMs, ...deps]);
}
