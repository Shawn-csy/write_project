import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface HorizontalScrollLaneProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  actionLabel?: React.ReactNode;
  onAction?: () => void;
}

function HorizontalScrollLaneInner({ children, title, actionLabel, onAction }: HorizontalScrollLaneProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showLeft, setShowLeft] = useState<boolean>(false);
  const [showRight, setShowRight] = useState<boolean>(false);
  const [isLaneHovered, setIsLaneHovered] = useState<boolean>(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 0);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener("resize", checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => ro.disconnect();
  }, [checkScroll]);

  const scroll = (direction: "left" | "right"): void => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    const scrollAmount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const handleMouseEnter = useCallback(() => setIsLaneHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsLaneHovered(false), []);
  const handleScrollLeft = useCallback(() => scroll("left"), []);
  const handleScrollRight = useCallback(() => scroll("right"), []);

  return (
    <section className="relative w-full flex flex-col">
      {title && (
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {actionLabel && typeof onAction === "function" ? (
            <button
              type="button"
              onClick={onAction}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      )}
      <div
        className="relative w-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {showLeft && (
          <div
            className={`absolute -left-4 top-0 bottom-6 z-10 pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
              isLaneHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <button
              type="button"
              className="pointer-events-auto rounded-full shadow-md border border-border w-10 h-10 hover:scale-105 active:scale-95 transition-transform bg-background/95 hover:bg-background flex items-center justify-center cursor-pointer"
              onClick={handleScrollLeft}
              aria-label="向左滑動"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory scroll-smooth px-2"
        >
          {children}
        </div>

        {showRight && (
          <div
            className={`absolute -right-4 top-0 bottom-6 z-10 pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
              isLaneHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <button
              type="button"
              className="pointer-events-auto rounded-full shadow-md border border-border w-10 h-10 hover:scale-105 active:scale-95 transition-transform bg-background/95 hover:bg-background flex items-center justify-center cursor-pointer"
              onClick={handleScrollRight}
              aria-label="向右滑動"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export const HorizontalScrollLane = React.memo(HorizontalScrollLaneInner);
