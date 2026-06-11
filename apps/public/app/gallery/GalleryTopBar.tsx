"use client";

import { SlidersHorizontal } from "lucide-react";
import type { GalleryTab } from "./useGalleryController";

interface GalleryTopBarProps {
  activeTab: GalleryTab;
  onTabChange: (tab: GalleryTab) => void;
  onOpenMobileFilter: () => void;
}

const TABS: Array<{ key: GalleryTab; label: string }> = [
  { key: "scripts", label: "台本" },
  { key: "authors", label: "作者" },
  { key: "orgs", label: "組織" },
];

export function GalleryTopBar({
  activeTab,
  onTabChange,
  onOpenMobileFilter,
}: GalleryTopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <span className="font-serif font-bold text-foreground text-base shrink-0">
          Screenplay Reader
        </span>
        <nav className="flex items-center gap-1 ml-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                tab.key === activeTab
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {activeTab === "scripts" && (
          <button
            type="button"
            onClick={onOpenMobileFilter}
            aria-label="開啟篩選"
            className="lg:hidden ml-auto flex items-center gap-1.5 rounded-md border border-border/70 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            篩選
          </button>
        )}
        <a
          href="/dashboard"
          className="ml-auto lg:ml-2 hidden sm:inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          工作室
        </a>
      </div>
    </header>
  );
}
