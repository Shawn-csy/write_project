"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Sun, Moon, Monitor, SlidersHorizontal } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const THEME_OPTIONS = [
  { value: "light",  label: "亮色",   icon: Sun },
  { value: "dark",   label: "暗色",   icon: Moon },
  { value: "system", label: "跟隨系統", icon: Monitor },
] as const;

type Theme = "light" | "dark" | "system";

export function PublicAppearanceMenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="外觀設定"
          title="外觀設定"
          className="flex h-11 w-11 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-[101] w-40 rounded-lg border border-border/60 bg-background shadow-md py-1 text-sm"
        >
          <DropdownMenu.Label className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            主題
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className="flex items-center gap-2.5 px-3 py-2 text-sm outline-none cursor-pointer select-none text-muted-foreground hover:text-foreground hover:bg-muted focus:text-foreground focus:bg-muted transition-colors relative"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
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
