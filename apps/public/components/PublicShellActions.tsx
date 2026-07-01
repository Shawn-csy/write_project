"use client";

/**
 * PublicShellActions — desktop-only trailing slot for public topbar.
 * Mobile actions (appearance, info, studio) are handled by the mobile action sheet
 * in GalleryTopBar, not here.
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
      className="inline-flex items-center rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90"
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
    <div className="flex items-center gap-2">
      <PublicAppearanceMenu />
      <PublicInfoMenu />
      <StudioLink />
    </div>
  );
}
