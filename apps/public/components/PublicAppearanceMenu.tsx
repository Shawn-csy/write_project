"use client";

import * as Popover from "@radix-ui/react-popover";
import { Sun, Moon, Monitor, SlidersHorizontal } from "lucide-react";
import { usePublicAppearance } from "@/components/PublicAppearanceContext";
import type { AppearanceTheme, ReaderFontFamily } from "@/lib/publicAppearancePreferences";

const THEME_OPTIONS: { value: AppearanceTheme; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: "light",  label: "亮色",    Icon: Sun },
  { value: "dark",   label: "暗色",    Icon: Moon },
  { value: "system", label: "跟隨系統", Icon: Monitor },
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

const sectionHeadingClass = "mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60";
const segBtnBase = "flex-1 rounded py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const segBtnActive = "bg-primary text-primary-foreground";
const segBtnInactive = "text-muted-foreground hover:text-foreground hover:bg-muted";

export function PublicAppearanceMenu() {
  const { prefs, setTheme, setReaderFontFamily, setReaderFontSize, setReaderLineHeight } = usePublicAppearance();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="外觀設定"
          title="外觀設定"
          className="flex h-11 w-11 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-[101] w-72 rounded-xl border border-border/60 bg-background p-4 shadow-lg space-y-4 text-sm"
        >
          {/* Theme */}
          <section>
            <p className={sectionHeadingClass}>主題</p>
            <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="主題">
              {THEME_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={prefs.theme === value}
                  onClick={() => setTheme(value)}
                  className={`${segBtnBase} flex items-center justify-center gap-1.5 ${prefs.theme === value ? segBtnActive : segBtnInactive}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Font family */}
          <section>
            <p className={sectionHeadingClass}>字體</p>
            <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="字體">
              {FONT_FAMILY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={prefs.readerFontFamily === value}
                  onClick={() => setReaderFontFamily(value)}
                  className={`${segBtnBase} ${prefs.readerFontFamily === value ? segBtnActive : segBtnInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Font size */}
          <section>
            <p className={sectionHeadingClass}>字級</p>
            <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="字級">
              {FONT_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={prefs.readerFontSize === size}
                  onClick={() => setReaderFontSize(size)}
                  className={`${segBtnBase} ${prefs.readerFontSize === size ? segBtnActive : segBtnInactive}`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </section>

          {/* Line height */}
          <section>
            <p className={sectionHeadingClass}>行距</p>
            <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="行距">
              {LINE_HEIGHT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={prefs.readerLineHeight === value}
                  onClick={() => setReaderLineHeight(value)}
                  className={`${segBtnBase} ${prefs.readerLineHeight === value ? segBtnActive : segBtnInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
