import React from "react";
import ScriptViewer from "../renderer/ScriptViewer";

export default function ScriptSurface({
  show = true,
  readOnly = false,
  outerClassName,
  scrollClassName,
  contentClassName,
  scrollRef,
  onScrollProgress,
  onDoubleClick,
  onContentClick,
  isLoading = false,
  loadingMessage,
  emptyMessage,
  text,
  viewerProps = {},
  headerNode,
}) {
  const rafRef = React.useRef(null);
  const touchStartRef = React.useRef(null);
  const lastTapRef = React.useRef({ time: 0, x: 0, y: 0 });

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

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (event) => {
    if (!onDoubleClick) return;
    const touch = event.changedTouches?.[0];
    if (!touch || !touchStartRef.current) return;

    const start = touchStartRef.current;
    touchStartRef.current = null;
    const moveDistance = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
    if (moveDistance > 24) return;

    const now = Date.now();
    const delta = now - lastTapRef.current.time;
    const tapDistance = Math.hypot(
      touch.clientX - lastTapRef.current.x,
      touch.clientY - lastTapRef.current.y
    );

    if (delta >= 0 && delta <= 320 && tapDistance < 32) {
      onDoubleClick(event);
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }

    lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={onContentClick}
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
