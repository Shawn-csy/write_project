"use client";

import * as Popover from "@radix-ui/react-popover";
import { Sun, Moon, Monitor, SlidersHorizontal } from "lucide-react";
import { usePublicAppearance } from "@/components/PublicAppearanceContext";
import type { AppearanceTheme, SiteTextScale } from "@/lib/publicAppearancePreferences";

const THEME_OPTIONS: { value: AppearanceTheme; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: "light",  label: "亮色",    Icon: Sun },
  { value: "dark",   label: "暗色",    Icon: Moon },
  { value: "system", label: "跟隨系統", Icon: Monitor },
];

const SITE_TEXT_SCALE_OPTIONS: { value: SiteTextScale; label: string }[] = [
  { value: "compact",     label: "精簡" },
  { value: "default",     label: "標準" },
  { value: "comfortable", label: "舒適" },
  { value: "large",       label: "大字" },
];

const sectionHeadingClass = "mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60";
const segBtnBase = "flex-1 rounded py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const segBtnActive = "bg-primary text-primary-foreground";
const segBtnInactive = "text-muted-foreground hover:text-foreground hover:bg-muted";

export function PublicAppearanceMenu() {
  const { prefs, setTheme, setSiteTextScale } = usePublicAppearance();

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

          {/* Site text scale */}
          <section>
            <p className={sectionHeadingClass}>首頁文字</p>
            <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="首頁文字">
              {SITE_TEXT_SCALE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={prefs.siteTextScale === value}
                  onClick={() => setSiteTextScale(value)}
                  className={`${segBtnBase} ${prefs.siteTextScale === value ? segBtnActive : segBtnInactive}`}
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
