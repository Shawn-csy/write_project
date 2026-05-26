import { useState, useCallback, useRef, useEffect } from "react";
import type React from "react";

const STORAGE_KEY = "live_editor_pane_width_percent";
const MIN = 28;
const MAX = 72;

function clamp(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(MAX, Math.max(MIN, value));
}

export function useEditorResize({ readOnly, showPreview }: { readOnly: boolean; showPreview: boolean }) {
  const editorPreviewContainerRef = useRef<HTMLDivElement | null>(null);
  const editorPaneWidthRef = useRef(50);
  const resizeFrameRef = useRef<number | null>(null);

  const [editorPaneWidth, setEditorPaneWidth] = useState(() => {
    if (typeof window === "undefined") return 50;
    return clamp(Number(window.localStorage.getItem(STORAGE_KEY)));
  });
  const [isResizing, setIsResizing] = useState(false);

  const persist = useCallback((value: number) => {
    try { window.localStorage.setItem(STORAGE_KEY, String(Math.round(value * 10) / 10)); } catch { /* ignore */ }
  }, []);

  const applyWidth = useCallback((next: number) => {
    const clamped = clamp(next);
    editorPaneWidthRef.current = clamped;
    const el = editorPreviewContainerRef.current;
    if (el) el.style.setProperty("--editor-pane-width", `${clamped}%`);
  }, []);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = editorPreviewContainerRef.current;
    if (!el || !Number.isFinite(clientX)) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    if (resizeFrameRef.current) return;
    resizeFrameRef.current = requestAnimationFrame(() => {
      applyWidth(ratio);
      resizeFrameRef.current = null;
    });
  }, [applyWidth]);

  const handleResizerPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (readOnly || !showPreview) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsResizing(true);
    updateFromClientX(e.clientX);
  }, [readOnly, showPreview, updateFromClientX]);

  const handleResizerPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!isResizing) return;
    updateFromClientX(e.clientX);
  }, [isResizing, updateFromClientX]);

  const handleResizerPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const final = editorPaneWidthRef.current;
    setEditorPaneWidth(final);
    persist(final);
    setIsResizing(false);
  }, [persist]);

  const handleResizerDoubleClick = useCallback(() => {
    applyWidth(50);
    setEditorPaneWidth(50);
    persist(50);
  }, [applyWidth, persist]);

  useEffect(() => { applyWidth(editorPaneWidth); }, [editorPaneWidth, applyWidth]);

  useEffect(() => {
    if (!isResizing) return undefined;
    const prev = { cursor: document.body.style.cursor, userSelect: document.body.style.userSelect };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = prev.cursor;
      document.body.style.userSelect = prev.userSelect;
    };
  }, [isResizing]);

  useEffect(() => () => { if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current); }, []);

  return {
    editorPreviewContainerRef,
    editorPaneWidth,
    isResizing,
    handleResizerPointerDown,
    handleResizerPointerMove,
    handleResizerPointerUp,
    handleResizerDoubleClick,
  };
}
