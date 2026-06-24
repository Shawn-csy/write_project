"use client";

/**
 * PublicShellActions — thin composition layer for public topbar trailing slot.
 * Appearance and info concerns live in their own components.
 */

import { PublicAppearanceMenu } from "@/components/PublicAppearanceMenu";
import { PublicInfoMenu } from "@/components/PublicInfoMenu";

export function PublicShellActions() {
  return (
    <div className="flex items-center gap-2">
      <PublicAppearanceMenu />
      <PublicInfoMenu />
      <a
        href="/dashboard"
        className="hidden sm:inline-flex items-center rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
        style={{
          background: "hsl(var(--primary))",
          boxShadow: "0 1px 3px hsl(var(--primary)/0.3), inset 0 0.5px 0 hsl(0 0% 100% / 0.15)",
        }}
      >
        進入工作室
      </a>
    </div>
  );
}
