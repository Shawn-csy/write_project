"use client";

/**
 * PublicShellActions — shared trailing slot for public page topbars.
 * Used by GalleryTopBar (homepage) and PublicTopBar (author/org/series/tag pages).
 *
 * Contains: theme toggle, studio link, info links (help / about / license).
 * Language switching is intentionally omitted until Next.js i18n is designed.
 */

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";

function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
  const label =
    theme === "dark" ? "切換至淡色模式" : theme === "light" ? "切換至系統模式" : "切換至深色模式";
  const icon = theme === "dark" ? "☀" : theme === "light" ? "◑" : "☽";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {icon}
    </button>
  );
}

const itemClass =
  "block px-4 py-2 text-sm text-muted-foreground outline-none cursor-pointer select-none hover:text-foreground hover:bg-muted focus:text-foreground focus:bg-muted transition-colors";

export function PublicShellActions() {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggleButton />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="資訊選單"
            title="資訊選單"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            ?
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-[101] w-40 rounded-lg border border-border/60 bg-background shadow-md py-1 text-sm"
          >
            <DropdownMenu.Item asChild>
              <a href="/help" className={itemClass}>使用說明</a>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <a href="/license" className={itemClass}>授權說明</a>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <a href="/about" className={itemClass}>關於我們</a>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 border-t border-border/40" />
            <DropdownMenu.Item asChild>
              <a href="/privacy" className={itemClass}>隱私政策</a>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <a href="/terms" className={itemClass}>使用條款</a>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <a
        href="/dashboard"
        className="hidden sm:inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        工作室
      </a>
    </div>
  );
}
