"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "public-gallery:layout";

function readCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.sidebarCollapsed === "boolean") return parsed.sidebarCollapsed;
  } catch {
    // ignore
  }
  return false;
}

function writeCollapsed(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebarCollapsed: value }));
  } catch {
    // quota exceeded or storage blocked
  }
}

export function useGalleryLayoutState() {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);

  useEffect(() => {
    setSidebarCollapsedState(readCollapsed());
  }, []);

  const setSidebarCollapsed = useCallback((next: boolean) => {
    setSidebarCollapsedState(next);
    writeCollapsed(next);
  }, []);

  return { sidebarCollapsed, setSidebarCollapsed };
}
