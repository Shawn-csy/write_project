import React from "react";
import ScriptViewer from "./ScriptViewer";

export default function ScriptSurface({
  show = true,
  readOnly = false,
  outerClassName,
  scrollClassName,
  contentClassName,
  scrollRef,
  onScrollProgress,
  onDoubleClick,
  isLoading = false,
  loadingMessage,
  emptyMessage,
  text,
  viewerProps = {},
  headerNode,
}) {
  const rafRef = React.useRef(null);

  const handleScroll = () => {
    if (!scrollRef?.current || !onScrollProgress) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) {
        onScrollProgress(0);
        return;
      }
      const percent = Math.min(100, Math.max(0, (el.scrollTop / max) * 100));
      onScrollProgress(Number.isFinite(percent) ? percent : 0);
    });
  };

  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!show && !readOnly) return null;

  return (
    <div className={outerClassName}>
      <div
        className={scrollClassName}
        ref={scrollRef}
        onScroll={handleScroll}
        onDoubleClick={onDoubleClick}
      >
        <div className={contentClassName}>
          {headerNode}
          {isLoading && loadingMessage && (
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          )}
          {!isLoading && text && <ScriptViewer text={text} {...viewerProps} />}
          {!isLoading && !text && emptyMessage && (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
