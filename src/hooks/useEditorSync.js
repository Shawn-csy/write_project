import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { EditorView, Decoration } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";

export function useEditorSync({ readOnly, showPreview }) {
  const previewRef = useRef(null);
  const editorViewRef = useRef(null);
  const ignoreEditorScrollRef = useRef(false);
  const ignorePreviewScrollRef = useRef(false);
  const [editorReady, setEditorReady] = useState(false);

  const setHighlightLine = useMemo(
    () => StateEffect.define(),
    []
  );

  const highlightField = useMemo(
    () =>
      StateField.define({
        create() {
          return Decoration.none;
        },
        update(deco, tr) {
          let next = deco.map(tr.changes);
          for (const effect of tr.effects) {
            if (effect.is(setHighlightLine)) {
              if (!effect.value) {
                next = Decoration.none;
              } else {
                const line = tr.state.doc.line(effect.value);
                next = Decoration.set([
                  Decoration.line({ class: "cm-highlight-line" }).range(line.from),
                ]);
              }
            }
          }
          return next;
        },
        provide: (f) => EditorView.decorations.from(f),
      }),
    [setHighlightLine]
  );

  const handleEditorScroll = useCallback(() => {
    if (ignoreEditorScrollRef.current) return;
    const view = editorViewRef.current;
    if (!view) return;
    const preview = previewRef.current;
    if (!preview) return;
    const editorMax = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight;
    const previewMax = preview.scrollHeight - preview.clientHeight;
    if (editorMax <= 0 || previewMax <= 0) return;
    const ratio = view.scrollDOM.scrollTop / editorMax;
    ignorePreviewScrollRef.current = true;
    preview.scrollTo({ top: previewMax * ratio, behavior: "auto" });
    requestAnimationFrame(() => {
      ignorePreviewScrollRef.current = false;
    });
  }, []);

  const scrollSyncExtension = useMemo(
    () =>
      EditorView.domEventHandlers({
        scroll: () => {
          handleEditorScroll();
        },
      }),
    [handleEditorScroll]
  );

  const highlightExtension = useMemo(
    () => [highlightField],
    [highlightField]
  );

  const handlePreviewScroll = useCallback(() => {
    if (ignorePreviewScrollRef.current) return;
    const container = previewRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const view = editorViewRef.current;
    if (!view) return;
    const previewMax = container.scrollHeight - container.clientHeight;
    const editorMax = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight;
    if (editorMax <= 0 || previewMax <= 0) return;
    const ratio = scrollTop / previewMax;
    ignoreEditorScrollRef.current = true;
    view.scrollDOM.scrollTo({ top: editorMax * ratio, behavior: "auto" });
    requestAnimationFrame(() => {
      ignoreEditorScrollRef.current = false;
    });
  }, []);

  const handleViewUpdate = useCallback((update) => {
    if (!update.view) return;
    editorViewRef.current = update.view;
    if (!editorReady) {
      setEditorReady(true);
    }
  }, [editorReady]);

  const scrollEditorToLine = useCallback((lineNumber, behaviorOrOptions = "auto") => {
    const view = editorViewRef.current;
    if (!view) return;
    const options =
      typeof behaviorOrOptions === "string"
        ? { behavior: behaviorOrOptions, center: true, select: true }
        : {
            behavior: behaviorOrOptions?.behavior ?? "auto",
            center: behaviorOrOptions?.center ?? true,
            select: behaviorOrOptions?.select ?? true,
          };
    const safeLine = Math.max(1, Math.min(lineNumber, view.state.doc.lines));
    const line = view.state.doc.line(safeLine);
    const scrollEffect = EditorView.scrollIntoView(line.from, {
      y: options.center ? "center" : "nearest",
      yMargin: 24,
    });
    if (options.select) {
      view.dispatch({
        selection: { anchor: line.from },
        effects: scrollEffect,
      });
    } else {
      view.dispatch({ effects: scrollEffect });
    }

    if (options.behavior === "smooth") {
      const coords = view.coordsAtPos(line.from);
      if (!coords) return;
      const scroller = view.scrollDOM;
      const scrollerRect = scroller.getBoundingClientRect();
      const lineHeight = Math.max(1, coords.bottom - coords.top);
      const targetTop =
        coords.top -
        scrollerRect.top +
        scroller.scrollTop -
        scrollerRect.height / 2 +
        lineHeight / 2;
      scroller.scrollTo({ top: targetTop, behavior: "smooth" });
    }
  }, []);

  const highlightEditorLine = useCallback((lineNumber) => {
    const view = editorViewRef.current;
    if (!view) return;
    const safeLine = Math.max(1, Math.min(lineNumber, view.state.doc.lines));
    view.dispatch({ effects: setHighlightLine.of(safeLine) });
  }, [setHighlightLine]);

  const clearHighlightLine = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return;
    view.dispatch({ effects: setHighlightLine.of(null) });
  }, [setHighlightLine]);

  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;
    const scrollDom = view.scrollDOM;
    scrollDom.addEventListener("scroll", handleEditorScroll, { passive: true });
    return () => scrollDom.removeEventListener("scroll", handleEditorScroll);
  }, [handleEditorScroll, editorReady]);

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    container.addEventListener("scroll", handlePreviewScroll, { passive: true });
    return () => container.removeEventListener("scroll", handlePreviewScroll);
  }, [handlePreviewScroll, showPreview, readOnly]);

  return {
    previewRef,
    editorViewRef,
    scrollSyncExtension,
    highlightExtension,
    handleViewUpdate,
    handleEditorScroll,
    setEditorReady,
    scrollEditorToLine,
    highlightEditorLine,
    clearHighlightLine
  };
}
