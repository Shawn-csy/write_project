import { useCallback } from "react";

export function usePreviewLineNavigation({
  content,
  readOnly,
  previewRef,
  scrollEditorToLine,
  highlightEditorLine,
  clearHighlightLine,
}) {
  const highlightTargetLine = useCallback(
    (lineNumber) => {
      if (!Number.isFinite(lineNumber) || lineNumber < 1) return;
      scrollEditorToLine(lineNumber, { behavior: "smooth", center: true, select: true });
      highlightEditorLine(lineNumber);
      setTimeout(() => {
        clearHighlightLine();
      }, 1200);
    },
    [scrollEditorToLine, highlightEditorLine, clearHighlightLine]
  );

  const findLineIndex = useCallback(
    (text) => {
      if (!text) return -1;
      const lines = (content || "").split("\n");
      let idx = lines.findIndex((line) => line.includes(text));
      if (idx !== -1) return idx;
      const trimmed = text.trim();
      if (!trimmed) return -1;
      idx = lines.findIndex((line) => line.trim() === trimmed);
      return idx;
    },
    [content]
  );

  const handleLocateText = useCallback(
    (text, lineNumber) => {
      if (!text && !lineNumber) return;
      if (readOnly) {
        const container = previewRef.current;
        if (!container) return;
        const lines = (content || "").split("\n");
        const idx = typeof lineNumber === "number" ? lineNumber - 1 : findLineIndex(text);
        if (idx < 0) return;
        const max = container.scrollHeight - container.clientHeight;
        if (max <= 0) return;
        const ratio = idx / Math.max(1, lines.length - 1);
        container.scrollTo({ top: max * ratio, behavior: "smooth" });
        return;
      }

      const idx = typeof lineNumber === "number" ? lineNumber : findLineIndex(text) + 1;
      highlightTargetLine(idx);
    },
    [readOnly, previewRef, content, findLineIndex, highlightTargetLine]
  );

  const handlePreviewLineClick = useCallback(
    (event) => {
      if (readOnly) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const lineEl = target.closest("[data-line-start]");
      if (!lineEl) return;
      const lineStart = Number(lineEl.getAttribute("data-line-start"));
      highlightTargetLine(lineStart);
    },
    [readOnly, highlightTargetLine]
  );

  return {
    handleLocateText,
    handlePreviewLineClick,
  };
}
