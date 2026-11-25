"use client";

import { useEffect, useState } from "react";

export function useProgressiveLimit(initial: number): number {
  const [limit, setLimit] = useState(initial);
  useEffect(() => {
    const expand = () => setLimit(Number.POSITIVE_INFINITY);
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(expand, { timeout: 1500 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(expand, 300);
    return () => window.clearTimeout(timer);
  }, []);
  return limit;
}
