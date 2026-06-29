"use client";

/**
 * PublicShellActions — thin composition layer for public topbar trailing slot.
 * Appearance and info concerns live in their own components.
 */

import { PublicAppearanceMenu } from "@/components/PublicAppearanceMenu";
import { PublicInfoMenu } from "@/components/PublicInfoMenu";
import { useAnimePressFeedback } from "@/lib/motion/useAnimePressFeedback";
import { useAnimePrewarm } from "@/lib/motion/useAnimePrewarm";

function StudioLink() {
  const { ref, handlers } = useAnimePressFeedback<HTMLAnchorElement>();
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
    // Mobile: 2 icon buttons × 44px + 1 gap × 8px = 96px (StudioLink hidden on mobile).
    // sm+: adds StudioLink ~80px + gap = ~184px → 12rem covers it.
    <div className="flex items-center gap-2 min-w-24 sm:min-w-[12rem] justify-end">
      <PublicAppearanceMenu />
      <PublicInfoMenu />
      <StudioLink />
    </div>
  );
}
