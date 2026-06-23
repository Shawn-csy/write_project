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
        className="hidden sm:inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        工作室
      </a>
    </div>
  );
}
