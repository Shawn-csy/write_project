import React from "react";
import * as Popover from "@radix-ui/react-popover";
import type { ReaderPreferencesState } from "./readerPreferences";
import {
  READER_FONT_SIZES,
  READER_LINE_HEIGHTS,
  READER_FONT_FAMILIES,
} from "./readerPreferences";
import type { ReaderFontSize, ReaderLineHeight, ReaderFontFamily, ReaderTheme } from "./readerPreferences";

const FONT_FAMILY_LABELS: Record<ReaderFontFamily, string> = {
  sans: "無襯線",
  serif: "襯線",
  mono: "等寬",
};

const THEME_OPTIONS: { value: ReaderTheme; label: string }[] = [
  { value: "system", label: "系統" },
  { value: "light", label: "淺色" },
  { value: "dark", label: "深色" },
];

const DefaultTrigger = React.forwardRef<HTMLButtonElement, { label: string }>(
  function DefaultTrigger({ label, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        {...props}
      >
        {label}
      </button>
    );
  }
);

export interface ReaderPreferencesPanelProps {
  preferences: ReaderPreferencesState;
  /** Label for the trigger button. Default: "閱讀設定" */
  triggerLabel?: string;
  align?: "start" | "center" | "end";
}

export function ReaderPreferencesPanel({
  preferences,
  triggerLabel = "閱讀設定",
  align = "end",
}: ReaderPreferencesPanelProps) {
  const { preferences: prefs, setTheme, setFontSize, setLineHeight, setFontFamily } = preferences;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <DefaultTrigger label={triggerLabel} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={4}
          className="z-50 w-64 rounded-md border border-border bg-background shadow-md outline-none"
          aria-label={triggerLabel}
        >
          <div className="p-3 space-y-4">

            {/* Theme */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">主題</div>
              <div className="flex gap-1">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={`flex-1 text-xs py-1 rounded border transition-colors ${
                      prefs.theme === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font family */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">字型</div>
              <div className="flex gap-1">
                {READER_FONT_FAMILIES.map((family) => (
                  <button
                    key={family}
                    type="button"
                    onClick={() => setFontFamily(family as ReaderFontFamily)}
                    className={`flex-1 text-xs py-1 rounded border transition-colors ${
                      prefs.fontFamily === family
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {FONT_FAMILY_LABELS[family as ReaderFontFamily]}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                字級 ({prefs.fontSize}px)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idx = READER_FONT_SIZES.indexOf(prefs.fontSize as ReaderFontSize);
                    if (idx > 0) setFontSize(READER_FONT_SIZES[idx - 1]);
                  }}
                  disabled={prefs.fontSize === READER_FONT_SIZES[0]}
                  className="w-6 h-6 flex items-center justify-center rounded border border-border/60 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="縮小字級"
                >
                  −
                </button>
                <div className="flex-1 flex gap-0.5">
                  {READER_FONT_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFontSize(size)}
                      className={`flex-1 h-1.5 rounded-full transition-colors ${
                        prefs.fontSize === size ? "bg-primary" : "bg-muted hover:bg-muted-foreground/40"
                      }`}
                      aria-label={`${size}px`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const idx = READER_FONT_SIZES.indexOf(prefs.fontSize as ReaderFontSize);
                    if (idx < READER_FONT_SIZES.length - 1) setFontSize(READER_FONT_SIZES[idx + 1]);
                  }}
                  disabled={prefs.fontSize === READER_FONT_SIZES[READER_FONT_SIZES.length - 1]}
                  className="w-6 h-6 flex items-center justify-center rounded border border-border/60 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="放大字級"
                >
                  +
                </button>
              </div>
            </div>

            {/* Line height */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                行距 ({prefs.lineHeight})
              </div>
              <div className="flex gap-1">
                {READER_LINE_HEIGHTS.map((lh) => (
                  <button
                    key={lh}
                    type="button"
                    onClick={() => setLineHeight(lh as ReaderLineHeight)}
                    className={`flex-1 text-xs py-1 rounded border transition-colors ${
                      prefs.lineHeight === lh
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {lh}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset */}
            <div className="pt-1 border-t border-border/40">
              <button
                type="button"
                onClick={preferences.reset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                恢復預設
              </button>
            </div>

          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
