"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Sun, Moon, Monitor, SlidersHorizontal } from "lucide-react";
import { usePublicAppearance } from "@/components/PublicAppearanceContext";
import type { AppearanceTheme, ReaderFontFamily } from "@/lib/publicAppearancePreferences";

const THEME_OPTIONS: { value: AppearanceTheme; label: string; icon: React.FC<{ className?: string; "aria-hidden"?: boolean }> }[] = [
  { value: "light",  label: "亮色",    icon: Sun },
  { value: "dark",   label: "暗色",    icon: Moon },
  { value: "system", label: "跟隨系統", icon: Monitor },
];

const FONT_FAMILY_OPTIONS: { value: ReaderFontFamily; label: string }[] = [
  { value: "sans",  label: "無襯線" },
  { value: "serif", label: "襯線" },
  { value: "mono",  label: "等寬" },
];

const FONT_SIZE_OPTIONS = [14, 16, 18, 20] as const;
const LINE_HEIGHT_OPTIONS: { value: number; label: string }[] = [
  { value: 1.4, label: "緊湊" },
  { value: 1.6, label: "標準" },
  { value: 1.8, label: "寬鬆" },
  { value: 2.0, label: "寬" },
];

const labelClass = "px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60";
const radioItemClass = "flex items-center gap-2.5 px-3 py-2 text-sm outline-none cursor-pointer select-none text-muted-foreground hover:text-foreground hover:bg-muted focus:text-foreground focus:bg-muted transition-colors relative";

export function PublicAppearanceMenu() {
  const { prefs, setTheme, setReaderFontFamily, setReaderFontSize, setReaderLineHeight } = usePublicAppearance();

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
          className="z-[101] w-44 rounded-lg border border-border/60 bg-background shadow-md py-1 text-sm"
        >
          {/* Theme */}
          <DropdownMenu.Label className={labelClass}>主題</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={prefs.theme} onValueChange={(v) => setTheme(v as AppearanceTheme)}>
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <DropdownMenu.RadioItem key={value} value={value} className={radioItemClass}>
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{label}</span>
                <DropdownMenu.ItemIndicator className="ml-auto text-primary text-xs">✓</DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Separator className="my-1 border-t border-border/40" />

          {/* Font family */}
          <DropdownMenu.Label className={labelClass}>字體</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={prefs.readerFontFamily} onValueChange={(v) => setReaderFontFamily(v as ReaderFontFamily)}>
            {FONT_FAMILY_OPTIONS.map(({ value, label }) => (
              <DropdownMenu.RadioItem key={value} value={value} className={radioItemClass}>
                <span>{label}</span>
                <DropdownMenu.ItemIndicator className="ml-auto text-primary text-xs">✓</DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Separator className="my-1 border-t border-border/40" />

          {/* Font size */}
          <DropdownMenu.Label className={labelClass}>字級</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={String(prefs.readerFontSize)} onValueChange={(v) => setReaderFontSize(Number(v))}>
            {FONT_SIZE_OPTIONS.map((size) => (
              <DropdownMenu.RadioItem key={size} value={String(size)} className={radioItemClass}>
                <span>{size}px</span>
                <DropdownMenu.ItemIndicator className="ml-auto text-primary text-xs">✓</DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Separator className="my-1 border-t border-border/40" />

          {/* Line height */}
          <DropdownMenu.Label className={labelClass}>行距</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={String(prefs.readerLineHeight)} onValueChange={(v) => setReaderLineHeight(Number(v))}>
            {LINE_HEIGHT_OPTIONS.map(({ value, label }) => (
              <DropdownMenu.RadioItem key={value} value={String(value)} className={radioItemClass}>
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
