"use client";

import * as Popover from "@radix-ui/react-popover";
import { Sun, Moon, Monitor, SlidersHorizontal } from "lucide-react";
import { usePublicAppearance } from "@/components/PublicAppearanceContext";
import { AnimatedSegment } from "@/components/AnimatedSegment";
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

const sectionHeadingClass = "mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/55";

export function PublicAppearanceMenu() {
  const { prefs, setTheme, setSiteTextScale } = usePublicAppearance();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="外觀設定"
          title="外觀設定"
          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-[101] w-72 rounded-xl p-4 space-y-4 text-sm"
          style={{
            border: "1px solid hsl(var(--border) / 0.6)",
            background: "hsl(var(--card))",
            boxShadow: "0 8px 30px hsl(var(--foreground)/0.1), 0 2px 8px hsl(var(--foreground)/0.06), 0 0 0 0.5px hsl(var(--border)/0.5)",
          }}
        >
          {/* Theme */}
          <section>
            <p className={sectionHeadingClass}>主題</p>
            <AnimatedSegment
              options={THEME_OPTIONS}
              value={prefs.theme}
              onChange={setTheme}
              label="主題"
              renderOption={(opt) => {
                const full = THEME_OPTIONS.find((o) => o.value === opt.value)!;
                return (
                  <span className="flex items-center justify-center gap-1.5">
                    <full.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{opt.label}</span>
                  </span>
                );
              }}
            />
          </section>

          {/* Site text scale */}
          <section>
            <p className={sectionHeadingClass}>首頁文字</p>
            <AnimatedSegment
              options={SITE_TEXT_SCALE_OPTIONS}
              value={prefs.siteTextScale}
              onChange={setSiteTextScale}
              label="首頁文字"
            />
          </section>

        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
