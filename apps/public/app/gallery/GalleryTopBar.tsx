"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PublicGalleryTopBar } from "@write/public-ui";
import type { GalleryView } from "@write/public-ui";
import { PublicShellActions } from "@/components/PublicShellActions";
import { AppearanceMenuContent } from "@/components/PublicAppearanceMenu";
import { InfoMenuContent } from "@/components/PublicInfoMenu";

export type { GalleryView };

const overlayHeadingClass =
  "flex w-full items-center justify-between px-3 py-3 text-[0.8125rem] font-semibold text-foreground";
const overlayChevronClass =
  "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150";

function OverlaySection({
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
        className={overlayHeadingClass}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label}
        <ChevronDown
          className={overlayChevronClass}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
          aria-hidden
        />
      </button>
      {open && <div className="px-3 pb-4">{children}</div>}
    </div>
  );
}

function MobileOverlayExtra() {
  return (
    <>
      <OverlaySection label="外觀設定">
        <AppearanceMenuContent />
      </OverlaySection>
      <OverlaySection label="說明與資訊">
        <InfoMenuContent />
      </OverlaySection>
    </>
  );
}

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
  return (
    <PublicGalleryTopBar
      activeTab={activeTab}
      onTabChange={onTabChange}
      onOpenMobileFilter={onOpenMobileFilter}
      brandName="公開台本"
      brandSubtitle="泛用型產品作坊"
      mobileStudioHref="/dashboard"
      mobileOverlayExtra={<MobileOverlayExtra />}
      trailing={<PublicShellActions />}
    />
  );
}
