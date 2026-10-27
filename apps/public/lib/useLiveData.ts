"use client";

import { useEffect, useRef, useState } from "react";
import { LiveApiError } from "./liveApi";

export type LiveData<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "missing" }
  | { status: "error" };

/**
 * Shows `initial` (the build-time snapshot) at once, then replaces it with what
 * `load` returns if that differs. `load` returns null when the thing no longer
 * exists. Without an initial value the hook starts in "loading".
 *
 * A failed refresh keeps the snapshot on screen; only a missing snapshot turns
 * a failure into an error.
 */
export function useLiveData<T>(
  initial: T | undefined,
  load: (signal: AbortSignal) => Promise<T | null>,
  key: string,
): LiveData<T> {
  const [state, setState] = useState<LiveData<T>>(
    initial === undefined ? { status: "loading" } : { status: "ready", data: initial },
  );
  const loadRef = useRef(load);
  loadRef.current = load;
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    const controller = new AbortController();
    const baked = initialRef.current;
    (async () => {
      try {
        const data = await loadRef.current(controller.signal);
        if (controller.signal.aborted) return;
        if (data === null) {
          setState({ status: "missing" });
          return;
        }
        if (baked !== undefined && JSON.stringify(baked) === JSON.stringify(data)) return;
        setState({ status: "ready", data });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof LiveApiError && error.status === 404) setState({ status: "missing" });
        else if (baked === undefined) setState({ status: "error" });
      }
    })();
    return () => controller.abort();
  }, [key]);

  return state;
}
