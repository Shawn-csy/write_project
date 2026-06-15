"use client";

/**
 * PublicShellActions — shared trailing slot for public page topbars.
 * Used by GalleryTopBar (homepage) and PublicTopBar (author/org/series/tag pages).
 *
 * Contains: theme toggle, studio link, info links (help / about / license).
 * Language switching is intentionally omitted until Next.js i18n is designed.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

function InfoDropdown({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || typeof window === "undefined") return null;

  const rect = anchorRef.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + 4 : 0;
  const right = rect ? window.innerWidth - rect.right : 0;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} aria-hidden />
      <div
        className="fixed z-[101] w-40 rounded-lg border border-border/60 bg-background shadow-md py-1 text-sm"
        style={{ top, right }}
      >
        <a
          href="/help"
          className="block px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          使用說明
        </a>
        <a
          href="/license"
          className="block px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          授權說明
        </a>
        <a
          href="/about"
          className="block px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          關於我們
        </a>
        <div className="my-1 border-t border-border/40" />
        <a
          href="/privacy"
          className="block px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          隱私政策
        </a>
        <a
          href="/terms"
          className="block px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          使用條款
        </a>
      </div>
    </>,
    document.body
  );
}

export function PublicShellActions() {
  const [infoOpen, setInfoOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex items-center gap-2">
      <ThemeToggleButton />

      <div className="relative">
        <button
          ref={infoButtonRef}
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          aria-label="資訊選單"
          title="資訊選單"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          ?
        </button>
        <InfoDropdown open={infoOpen} onClose={() => setInfoOpen(false)} anchorRef={infoButtonRef} />
      </div>

      <a
        href="/dashboard"
        className="hidden sm:inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        工作室
      </a>
    </div>
  );
}
