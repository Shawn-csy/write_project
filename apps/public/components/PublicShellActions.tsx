"use client";

/**
 * PublicShellActions — desktop-only trailing slot for public topbar.
 * Mobile actions (appearance, info, studio) use PublicMobileActionSheet
 * through PublicTopBar on every public page.
 */

import { PublicAppearanceMenu } from "@/components/PublicAppearanceMenu";
import { PublicInfoMenu } from "@/components/PublicInfoMenu";
import { LazyPublicFeedbackDialog } from "@/components/LazyPublicFeedbackDialog";
import { useAnimePressFeedback } from "@/lib/motion/useAnimePressFeedback";
import { studioUrl } from "@/lib/studioUrl";

function StudioLink() {
  const { ref, handlers } = useAnimePressFeedback<HTMLAnchorElement>();
  return (
    <a
      ref={ref}
      href={studioUrl()}
      aria-label="進入工作室"
      className="inline-flex items-center rounded-md px-2 py-1.5 text-[0.8125rem] text-muted-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground"
      {...handlers}
    >
      工作室
    </a>
  );
}

export function PublicShellActions() {
  return (
    <div className="flex items-center gap-2">
      <LazyPublicFeedbackDialog mode="bug" />
      <PublicAppearanceMenu />
      <PublicInfoMenu />
      <StudioLink />
    </div>
  );
}
