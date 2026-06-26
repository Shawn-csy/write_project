"use client";

import { useAnimeSegmentIndicator } from "@/lib/motion/useAnimeSegmentIndicator";

const segBtnBase =
  "relative flex-1 rounded-[5px] py-1.5 text-[0.8rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 z-10";

/**
 * Animated sliding pill segmented control.
 * Motion is delegated to useAnimeSegmentIndicator (lib/motion/).
 * Only transform/opacity are animated — no layout properties.
 */
export function AnimatedSegment<T extends string>({
  options,
  value,
  onChange,
  label,
  renderOption,
  btnClassName,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  renderOption?: (opt: { value: T; label: string }, active: boolean) => React.ReactNode;
  /** Extra classes applied to each button (e.g. for size variants). */
  btnClassName?: string;
}) {
  const { trackRef, pillRef, setBtnRef } = useAnimeSegmentIndicator(value);

  return (
    <div
      ref={trackRef}
      className="relative flex gap-0.5 rounded-lg p-0.5 bg-muted"
      role="group"
      aria-label={label}
    >
      {/* Sliding pill — positioned via transform, not left/width CSS */}
      <div
        ref={pillRef}
        aria-hidden
        className="absolute top-0.5 bottom-0.5 left-0 rounded-[5px] bg-background shadow-sm pointer-events-none"
        style={{ opacity: 0, width: 0, transformOrigin: "center" }}
      />
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            ref={setBtnRef(opt.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`${segBtnBase} ${btnClassName ?? ""} transition-colors duration-150 ${
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {renderOption ? renderOption(opt, active) : opt.label}
          </button>
        );
      })}
    </div>
  );
}
