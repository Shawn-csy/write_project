import { useCallback, useEffect, useRef } from "react";

export function useTextLocator(rawScript) {
    const readerHighlightRef = useRef(null);
    const readerHighlightTimeoutRef = useRef(null);
    const contentScrollRef = useRef(null);

    const clearReaderHighlight = useCallback(() => {
        if (readerHighlightTimeoutRef.current) {
            clearTimeout(readerHighlightTimeoutRef.current);
            readerHighlightTimeoutRef.current = null;
        }
        if (readerHighlightRef.current) {
            readerHighlightRef.current.classList.remove("reader-locate-highlight");
            readerHighlightRef.current = null;
        }
    }, []);

    const handleLocateText = useCallback((text, lineNumber) => {
        const container = contentScrollRef.current;
        if (!container || !rawScript) return;

        const targetLine = Number.isFinite(lineNumber) ? lineNumber : null;
        if (targetLine) {
            const targetEl = container.querySelector(`[data-line-start="${targetLine}"]`);

            if (targetEl) {
                clearReaderHighlight();
                const containerRect = container.getBoundingClientRect();
                const targetRect = targetEl.getBoundingClientRect();
                const offsetTop = targetRect.top - containerRect.top + container.scrollTop;
                const targetTop = offsetTop - container.clientHeight / 2 + targetRect.height / 2;
                const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
                container.scrollTo({
                    top: Math.max(0, Math.min(maxTop, targetTop)),
                    behavior: "smooth",
                });
                targetEl.classList.add("reader-locate-highlight");
                readerHighlightRef.current = targetEl;
                readerHighlightTimeoutRef.current = setTimeout(() => {
                    clearReaderHighlight();
                }, 1400);
                return;
            }
        }

        const lines = rawScript.split("\n");
        let idx = typeof lineNumber === "number"
            ? lineNumber - 1
            : lines.findIndex((line) => line.includes(text || ""));
        if (idx < 0 && text) {
            const trimmed = text.trim();
            idx = lines.findIndex((line) => line.trim() === trimmed);
        }

        if (idx < 0) return;
        const max = container.scrollHeight - container.clientHeight;
        if (max <= 0) return;
        const ratio = idx / Math.max(1, lines.length - 1);
        container.scrollTo({ top: max * ratio, behavior: "smooth" });
    }, [rawScript, clearReaderHighlight]);

    useEffect(() => {
        return () => {
            clearReaderHighlight();
        };
    }, [clearReaderHighlight]);

    return { contentScrollRef, handleLocateText };
}
