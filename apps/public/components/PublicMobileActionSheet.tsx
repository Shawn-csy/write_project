"use client";

import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import Link from "next/link";
import { ArrowUpRight, Headphones, MessageSquarePlus, Mic2, Play, UserRound, X } from "lucide-react";
import { AppearanceMenuContent } from "@/components/PublicAppearanceMenu";
import { InfoMenuContent } from "@/components/PublicInfoMenu";
import { studioUrl } from "@/lib/studioUrl";
import { PUBLIC_SECTION_TABS } from "@/lib/publicNavigation";

const sheetSectionTitleClass =
  "mb-2 px-0.5 text-xs font-semibold tracking-[0.12em] text-muted-foreground";

const SECTION_ICONS = { authors: UserRound, resources: Mic2, "audio-works": Headphones, demos: Play };
const PUBLIC_SECTIONS = PUBLIC_SECTION_TABS.map((tab) => ({ ...tab, Icon: SECTION_ICONS[tab.key] }));

export function PublicMobileActionSheet({ onClose, onOpenFeedback, activeTab }: { onClose: () => void; onOpenFeedback: () => void; activeTab: string }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Esc, focus trap, body scroll lock
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const sheet = document.getElementById("mobile-action-sheet");
      if (!sheet) return;
      const focusable = Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    const onStartFeedbackPicking = () => onClose();

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("public-feedback-start-target-picking", onStartFeedbackPicking);
    const rafId = requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("public-feedback-start-target-picking", onStartFeedbackPicking);
      cancelAnimationFrame(rafId);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 sm:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{ background: "hsl(var(--foreground) / 0.25)" }}
        aria-hidden
        onClick={onClose}
      />
      {/* Sheet panel */}
      <div
        id="mobile-action-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="更多選項"
        className="absolute bottom-0 left-0 right-0 flex max-h-[92dvh] min-h-0 flex-col overflow-hidden"
        style={{
          borderRadius: "1rem 1rem 0 0",
          background: "hsl(var(--background))",
          boxShadow: "0 -4px 32px hsl(var(--foreground) / 0.12), 0 -1px 0 hsl(var(--border) / 0.5)",
          paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2.5">
          <p className="text-base font-semibold text-foreground">更多選項</p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="關閉選單"
            className="flex h-12 w-12 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
          <section>
            <p className={sheetSectionTitleClass}>公開專區</p>
            <nav aria-label="公開專區" className="grid grid-cols-2 gap-2">
              {PUBLIC_SECTIONS.map(({ key, label, href, Icon }) => {
                const isActive = activeTab === key;
                return (
                  <Link
                    key={key}
                    href={href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "border-primary/35 bg-primary/10 text-foreground" : "border-border/60 bg-card/40 text-foreground hover:bg-muted/60"}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-primary/15 text-primary" : "bg-muted/70 text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>

          <a
            href={studioUrl()}
            aria-label="進入工作室"
            className="flex min-h-12 w-full items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>進入工作室</span>
            <ArrowUpRight className="h-4 w-4 text-primary" aria-hidden />
          </a>

          <section>
            <p className={sheetSectionTitleClass}>外觀設定</p>
            <div className="rounded-xl border border-border/60 bg-card/45 p-3">
              <AppearanceMenuContent />
            </div>
          </section>

          <section>
            <p className={sheetSectionTitleClass}>說明與資訊</p>
            <div className="rounded-xl border border-border/60 bg-card/45 p-2">
              <InfoMenuContent />
            </div>
          </section>

          <section>
            <p className={sheetSectionTitleClass}>回報問題</p>
            <button
              type="button"
              onClick={onOpenFeedback}
              className="flex h-12 w-full items-center gap-2 rounded-xl border border-border/60 bg-card/45 px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageSquarePlus className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>回報問題</span>
            </button>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
