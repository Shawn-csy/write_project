"use client";

import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { MoreHorizontal, X, ChevronDown } from "lucide-react";
import { PublicGalleryTopBar } from "@write/public-ui";
import type { GalleryView } from "@write/public-ui";
import { PublicShellActions } from "@/components/PublicShellActions";
import { AppearanceMenuContent } from "@/components/PublicAppearanceMenu";
import { InfoMenuContent } from "@/components/PublicInfoMenu";

export type { GalleryView };

// ── Bottom action sheet ──────────────────────────────────────────────────

const sectionHeadingClass =
  "flex w-full items-center justify-between px-5 py-3 text-[0.8125rem] font-semibold text-foreground";
const sectionChevronClass =
  "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150";

function SheetSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid hsl(var(--border) / 0.3)" }}>
      <button
        type="button"
        className={sectionHeadingClass}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label}
        <ChevronDown
          className={sectionChevronClass}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
          aria-hidden
        />
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function MobileActionSheet({ onClose }: { onClose: () => void }) {
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

    document.addEventListener("keydown", onKeyDown);
    const rafId = requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", onKeyDown);
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
        className="absolute bottom-0 left-0 right-0 flex flex-col max-h-[85vh] overflow-hidden"
        style={{
          borderRadius: "1rem 1rem 0 0",
          background: "hsl(var(--background))",
          boxShadow: "0 -4px 32px hsl(var(--foreground) / 0.12), 0 -1px 0 hsl(var(--border) / 0.5)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full editorial-handle" aria-hidden />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
          <p className="text-[0.9375rem] font-semibold text-foreground">更多</p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="關閉選單"
            className="h-11 w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          <SheetSection label="外觀設定">
            <AppearanceMenuContent />
          </SheetSection>
          <SheetSection label="說明與資訊">
            <InfoMenuContent />
          </SheetSection>
        </div>

        {/* Studio CTA */}
        <div className="px-5 pb-4 pt-2 shrink-0" style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}>
          <a
            href="/dashboard"
            className="flex items-center justify-center h-11 w-full rounded-lg text-[0.8125rem] font-semibold text-primary-foreground hover:opacity-90 transition-opacity duration-150"
            style={{ background: "hsl(var(--primary))" }}
          >
            進入工作室
          </a>
        </div>

        {/* Safe area spacer */}
        <div className="h-2" aria-hidden />
      </div>
    </div>,
    document.body
  );
}

// ── Gallery top bar composition ──────────────────────────────────────────

interface GalleryTopBarProps {
  activeTab: GalleryView;
  onTabChange: (tab: GalleryView) => void;
  onOpenMobileFilter: () => void;
}

export function GalleryTopBar({
  activeTab,
  onTabChange,
  onOpenMobileFilter,
}: GalleryTopBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <PublicGalleryTopBar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenMobileFilter={onOpenMobileFilter}
        brandName="公開台本"
        brandSubtitle="泛用型產品作坊"
        trailing={<PublicShellActions />}
        mobileTrailingAction={
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="更多選項"
            className="flex items-center justify-center h-11 w-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        }
      />
      {moreOpen && <MobileActionSheet onClose={() => setMoreOpen(false)} />}
    </>
  );
}
