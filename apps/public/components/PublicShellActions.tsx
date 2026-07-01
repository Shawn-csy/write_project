"use client";

/**
 * PublicShellActions — thin composition layer for public topbar trailing slot.
 * Appearance and info concerns live in their own components.
 */

import { PublicAppearanceMenu } from "@/components/PublicAppearanceMenu";
import { PublicInfoMenu } from "@/components/PublicInfoMenu";
import { useAnimePressFeedback } from "@/lib/motion/useAnimePressFeedback";
import { useAnimePrewarm } from "@/lib/motion/useAnimePrewarm";

function StudioLink({ mobile }: { mobile?: boolean }) {
  const { ref, handlers } = useAnimePressFeedback<HTMLAnchorElement>();
  return (
    <a
      ref={ref}
      href="/dashboard"
      className={
        mobile
          ? "sm:hidden flex items-center justify-center h-11 w-11 rounded-lg text-primary-foreground transition-all duration-150 hover:opacity-90"
          : "hidden sm:inline-flex items-center rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90"
      }
      aria-label={mobile ? "進入工作室" : undefined}
      style={{
        background: "hsl(var(--primary))",
        boxShadow: "0 1px 3px hsl(var(--primary)/0.3), inset 0 0.5px 0 hsl(0 0% 100% / 0.15)",
      }}
      {...handlers}
    >
      {mobile ? (
        // Studio icon — briefcase-like mark
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
          <rect x="2" y="6" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 6V4.5A1.5 1.5 0 0 1 6.5 3h3A1.5 1.5 0 0 1 11 4.5V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ) : (
        "進入工作室"
      )}
    </a>
  );
}

export function PublicShellActions() {
  useAnimePrewarm();
  return (
    // min-w reserves stable space before hydration to prevent action-slot width shift.
    // Mobile: 3 icon buttons × 44px + 2 gaps × 8px = ~148px → 10rem covers it.
    // sm+: 2 icons + StudioLink text ~80px → 12rem covers it.
    <div className="flex items-center gap-2 min-w-[10rem] sm:min-w-[12rem] justify-end">
      <PublicAppearanceMenu />
      <PublicInfoMenu />
      <StudioLink mobile />
      <StudioLink />
    </div>
  );
}
