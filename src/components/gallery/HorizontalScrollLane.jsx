import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

export function HorizontalScrollLane({ children, title, actionLabel, onAction }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [isLaneHovered, setIsLaneHovered] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 0);
    // Use a small threshold (e.g. 5px) to account for fractional pixels
    setShowRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    // Re-check after a brief delay to ensure children have rendered their widths
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener("resize", checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkScroll);
    };
  }, [children]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    // Scroll by ~75% of the visible width so some context remains
    const scrollAmount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    // checkScroll will fire on the onScroll event automatically
  };

  return (
    <section className="relative w-full flex flex-col">
      {title && (
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {actionLabel && typeof onAction === "function" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          ) : null}
        </div>
      )}
      <div
        className="relative w-full"
        onMouseEnter={() => setIsLaneHovered(true)}
        onMouseLeave={() => setIsLaneHovered(false)}
      >
        {/* Left Scroll Button */}
        {showLeft && (
          <div
            className={`absolute -left-4 top-0 bottom-6 z-10 pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
              isLaneHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <Button
              variant="secondary"
              size="icon"
              className="pointer-events-auto rounded-full shadow-md border border-border w-10 h-10 hover:scale-105 active:scale-95 transition-transform bg-background/95 hover:bg-background"
              onClick={() => scroll("left")}
              aria-label="向左滑動"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </Button>
          </div>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory scroll-smooth px-2"
        >
          {children}
        </div>

        {/* Right Scroll Button */}
        {showRight && (
          <div
            className={`absolute -right-4 top-0 bottom-6 z-10 pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
              isLaneHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <Button
              variant="secondary"
              size="icon"
              className="pointer-events-auto rounded-full shadow-md border border-border w-10 h-10 hover:scale-105 active:scale-95 transition-transform bg-background/95 hover:bg-background"
              onClick={() => scroll("right")}
              aria-label="向右滑動"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
