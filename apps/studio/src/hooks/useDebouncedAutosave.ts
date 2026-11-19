import { useEffect, useRef } from "react";

interface UseDebouncedAutosaveOptions {
  enabled: boolean;
  delayMs?: number;
  save: () => Promise<void> | void;
}

export function useDebouncedAutosave({
  enabled,
  delayMs = 800,
  save,
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
  }, [enabled, delayMs]);
}
