"use client";

/**
 * PublicShellActions — shared trailing slot for public page topbars.
 * Used by GalleryTopBar (homepage) and PublicTopBar (author/org/series/tag pages).
 *
 * Contains: theme selector, studio link, info links (help / about / license).
 * Reader preferences (font/size/lineHeight/markers) are reader-domain only — they
 * live in /read/[id] via useReaderState, not here.
 */

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Sun, Moon, Monitor, ChevronDown } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const THEME_OPTIONS = [
  { value: "light", label: "亮色", icon: Sun },
  { value: "dark",  label: "暗色", icon: Moon },
  { value: "system", label: "跟隨系統", icon: Monitor },
] as const;

type Theme = "light" | "dark" | "system";

function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const current = THEME_OPTIONS.find((o) => o.value === theme) ?? THEME_OPTIONS[2];
  const Icon = current.icon;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="切換主題"
          title="切換主題"
          className="flex h-8 items-center gap-1.5 px-2.5 rounded-md border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          <ChevronDown className="h-3 w-3 opacity-50" aria-hidden />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-[101] w-36 rounded-lg border border-border/60 bg-background shadow-md py-1 text-sm"
        >
          <DropdownMenu.RadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
            {THEME_OPTIONS.map(({ value, label, icon: ItemIcon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className="flex items-center gap-2.5 px-3 py-2 text-sm outline-none cursor-pointer select-none text-muted-foreground hover:text-foreground hover:bg-muted focus:text-foreground focus:bg-muted transition-colors relative"
              >
                <ItemIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{label}</span>
                <DropdownMenu.ItemIndicator className="ml-auto text-primary text-xs">✓</DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const itemClass =
  "block px-4 py-2 text-sm text-muted-foreground outline-none cursor-pointer select-none hover:text-foreground hover:bg-muted focus:text-foreground focus:bg-muted transition-colors";

export function PublicShellActions() {
  return (
    <div className="flex items-center gap-2">
      <ThemeMenu />

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
