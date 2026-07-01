"use client";

import { useRef } from "react";
import { useHeroBrandAnimation } from "@/lib/motion/useHeroBrandAnimation";

const SCRIPT_LINES = [
  { delay: "0ms" },
  { delay: "200ms" },
  { delay: "400ms" },
  { delay: "600ms" },
  { delay: "800ms" },
];


export function BrandScriptDesk() {
  const ref = useRef<HTMLDivElement>(null);
  useHeroBrandAnimation(ref);

  return (
    <div
      ref={ref}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      data-testid="brand-script-desk"
      aria-hidden="true"
    >
      {/* Page stack — 3 entrance wrappers; inner nodes own static composition */}
      <div className="brand-desk-stack">
        {/* Back page — entrance wrapper preserves static back transform via inner */}
        <div data-script-page-enter className="brand-desk-page-enter">
          <div className="brand-desk-page brand-desk-page-back">
            <div className="brand-desk-ruled-line w-3/4" />
            <div className="brand-desk-ruled-line w-full" />
            <div className="brand-desk-ruled-line w-5/6" />
            <div className="brand-desk-ruled-line w-2/3" />
          </div>
        </div>

        {/* Middle page */}
        <div data-script-page-enter className="brand-desk-page-enter">
          <div className="brand-desk-page brand-desk-page-middle">
            <div className="brand-desk-ruled-line w-full" />
            <div className="brand-desk-ruled-line w-3/4" />
            <div className="brand-desk-ruled-line w-5/6" />
            <div className="brand-desk-ruled-line w-2/3" />
            <div className="brand-desk-ruled-line w-full" />
          </div>
        </div>

        {/* Front page */}
        <div data-script-page-enter className="brand-desk-page-enter">
          <div className="brand-desk-page brand-desk-page-front">
            <div className="mb-3 text-[9px] font-semibold tracking-[0.2em] text-primary/60 uppercase">Script</div>
            {SCRIPT_LINES.map((line, i) => (
              <div
                key={i}
                className="brand-desk-script-line brand-desk-script-line-type"
                style={{ "--desk-line-delay": line.delay } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Light sweep */}
      <div data-light-sweep className="brand-desk-sweep" />

      {/* Texture rule */}
      <div className="brand-desk-rule" />
    </div>
  );
}
