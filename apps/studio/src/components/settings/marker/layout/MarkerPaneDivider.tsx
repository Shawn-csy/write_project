import { useRef } from "react";
import { cn } from "../../../../lib/utils";

interface Props {
  className: string;
  label: string;
  controls: string;
  direction: 1 | -1;
  orientation?: "vertical" | "horizontal";
  range: { min: number; max: number; value: number };
  onResize: (width: number) => void;
  onReset: () => void;
}

export function MarkerPaneDivider({ className, label, controls, direction, orientation = "vertical", range, onResize, onReset }: Props) {
  const vertical = orientation === "vertical";
  const drag = useRef<{ id: number; position: number; size: number } | null>(null);
  const move = (event: React.PointerEvent) => {
    const active = drag.current;
    const position = vertical ? event.clientX : event.clientY;
    if (active?.id === event.pointerId) onResize(active.size + (position - active.position) * direction);
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-controls={controls}
      aria-orientation={orientation}
      aria-valuemin={range.min}
      aria-valuemax={Math.floor(range.max)}
      aria-valuenow={Math.round(range.value)}
      className={cn("group relative hidden touch-none select-none items-center justify-center bg-muted/50 hover:bg-primary/15 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring", vertical ? "cursor-col-resize" : "cursor-row-resize", className)}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, position: vertical ? event.clientX : event.clientY, size: range.value };
      }}
      onPointerMove={move}
      onPointerUp={move}
      onLostPointerCapture={() => { drag.current = null; }}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 8 : 24;
        switch (event.key) {
          case vertical ? "ArrowLeft" : "ArrowUp": onResize(range.value - step * direction); break;
          case vertical ? "ArrowRight" : "ArrowDown": onResize(range.value + step * direction); break;
          case "Home": onResize(range.min); break;
          case "End": onResize(range.max); break;
          default: return;
        }
        event.preventDefault();
      }}
    >
      <span aria-hidden="true" className={cn("pointer-events-none bg-border group-hover:bg-primary group-focus:bg-primary", vertical ? "h-full w-px" : "h-px w-full")} />
      <span aria-hidden="true" className={cn("pointer-events-none absolute rounded-full border border-muted-foreground/55 bg-background group-hover:border-primary group-hover:bg-primary/15 group-focus:border-primary", vertical ? "h-9 w-2" : "h-2 w-9")} />
    </div>
  );
}
