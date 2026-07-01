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
  if (mobile) {
    return (
      // h-11 = 44px touch target; pill span keeps visual size small
      <a
        ref={ref}
        href="/dashboard"
        className="sm:hidden inline-flex h-11 items-center justify-center rounded-lg px-2 hover:opacity-90 transition-opacity duration-150"
        {...handlers}
      >
        <span className="inline-flex items-center rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold text-primary-foreground bg-primary">
          工作室
        </span>
      </a>
    );
  }
  return (
    <a
      ref={ref}
      href="/dashboard"
      className="hidden sm:inline-flex items-center rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90"
      style={{
        background: "hsl(var(--primary))",
        boxShadow: "0 1px 3px hsl(var(--primary)/0.3), inset 0 0.5px 0 hsl(0 0% 100% / 0.15)",
      }}
      {...handlers}
    >
      進入工作室
    </a>
  );
}

export function PublicShellActions() {
  useAnimePrewarm();
  return (
    // min-w reserves stable space before hydration to prevent action-slot width shift.
    // Mobile: 2 icons × 44px + text ~54px + 2 gaps × 8px = ~158px → 10rem covers it.
    // sm+: 2 icons + StudioLink text ~80px + gaps → 12rem covers it.
    <div className="flex items-center gap-2 min-w-[10rem] sm:min-w-[12rem] justify-end">
      {/* Appearance + Info: desktop only — mobile uses nav overlay */}
      <div className="hidden sm:contents">
        <PublicAppearanceMenu />
        <PublicInfoMenu />
      </div>
      <StudioLink mobile />
      <StudioLink />
    </div>
  );
}
